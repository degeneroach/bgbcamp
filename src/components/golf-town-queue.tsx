"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import {
  ChevronDown,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  createGolfTownOrder,
  updateGolfTownOrder,
  deleteGolfTownOrder,
  reorderGolfTownOrders,
  setGolfTownOrderFlag,
  restoreGolfTownOrder,
  type OrderInput,
} from "@/app/(app)/tools/golf-town-queue/actions";
import { portalCreateOrder, portalUpdateOrder } from "@/app/(golftown)/golftown/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { GolfTownOrder } from "@/types/database";

const BALL_TYPES = [
  "TaylorMade Distance +",
  "Titleist Pro V1",
  "Titleist TruFeel",
  "Callaway Warbird",
  "Srixon Soft Feel",
];

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "svg"]);
const ACCEPTED_EXTENSIONS = new Set(["pdf", "ai", "eps", "svg", "png", "jpg", "jpeg"]);
const MAX_ARTWORK_BYTES = 25 * 1024 * 1024;

const FLAGS = [
  { key: "balls_received", label: "Balls received" },
  { key: "printed", label: "Printed / Ready for Pick Up" },
  { key: "shipped", label: "Picked up" },
  { key: "invoiced", label: "Invoiced" },
  { key: "paid", label: "Paid" },
] as const;

function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

// Plain URL construction — no Supabase client needed, which keeps the
// public portal page free of any Supabase key usage.
function artworkPublicUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/golf-town-artwork/${path}`;
}

function DatePill({ dateNeeded }: { dateNeeded: string | null }) {
  if (!dateNeeded) {
    return (
      <span className="w-fit rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
        No date
      </span>
    );
  }
  const due = parseISO(dateNeeded);
  const days = differenceInCalendarDays(due, startOfDay(new Date()));
  const label = format(due, "MMM d");
  if (days < 0) {
    return (
      <span className="w-fit rounded-full bg-destructive px-2.5 py-0.5 text-xs font-medium text-white">
        Late · {label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "w-fit rounded-full border px-2.5 py-0.5 text-xs tabular-nums",
        days < 3
          ? "border-destructive/40 font-medium text-destructive"
          : days <= 7
            ? "border-warning/40 font-medium text-warning"
            : "text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

function ArtworkThumb({ order }: { order: GolfTownOrder }) {
  if (!order.artwork_path) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-foreground/20">
        <span className="text-[10px] italic text-muted-foreground">No art</span>
      </div>
    );
  }
  const url = artworkPublicUrl(order.artwork_path);
  const ext = fileExtension(order.artwork_filename ?? order.artwork_path);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      draggable={false}
      title={order.artwork_filename ?? "Artwork"}
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg",
        // Grey behind images so transparent/dark logos stay visible;
        // file-type badges keep the darker tile.
        IMAGE_EXTENSIONS.has(ext) ? "bg-zinc-300 dark:bg-zinc-500" : "bg-black/40 dark:bg-black/60"
      )}
    >
      {IMAGE_EXTENSIONS.has(ext) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain p-1" draggable={false} />
      ) : (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {ext || "file"}
        </span>
      )}
    </a>
  );
}

export function GolfTownQueue({
  orders,
  organizationId,
  loadError,
  mode = "staff",
}: {
  orders: GolfTownOrder[];
  organizationId: string;
  loadError: string | null;
  /**
   * "staff" (internal queue, full capabilities) or "portal" (Matt's view:
   * no reorder/delete/complete/flags, staff orders read-only). Portal
   * restrictions are ALSO enforced server-side in the portal actions.
   */
  mode?: "staff" | "portal";
}) {
  const isStaff = mode === "staff";
  const [localOrders, setLocalOrders] = useState(orders);
  useEffect(() => setLocalOrders(orders), [orders]);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<GolfTownOrder | "new" | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  const active = useMemo(
    () =>
      localOrders
        .filter((o) => !o.completed_at)
        .sort((a, b) => a.position - b.position),
    [localOrders]
  );
  const completed = useMemo(
    () =>
      localOrders
        .filter((o) => o.completed_at)
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
    [localOrders]
  );

  function persistReorder(next: GolfTownOrder[]) {
    const previous = localOrders;
    setLocalOrders((current) => {
      const completedRows = current.filter((o) => o.completed_at);
      return [...next.map((o, i) => ({ ...o, position: i })), ...completedRows];
    });
    startTransition(async () => {
      const result = await reorderGolfTownOrders(next.map((o) => o.id));
      if (!result.ok) {
        setLocalOrders(previous);
        toast.error(result.error ?? "Couldn't save the new order.");
      }
    });
  }

  function handleDrop(targetIndex: number) {
    const id = dragId;
    setDragId(null);
    setDropIndex(null);
    if (!id) return;
    const fromIndex = active.findIndex((o) => o.id === id);
    if (fromIndex === -1) return;
    let insertAt = targetIndex;
    if (fromIndex < targetIndex) insertAt -= 1;
    if (insertAt === fromIndex) return;
    const next = [...active];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(insertAt, 0, moved);
    persistReorder(next);
  }

  function toggleFlag(order: GolfTownOrder, flag: (typeof FLAGS)[number]["key"], value: boolean) {
    const previous = localOrders;
    // Finished = picked up AND paid; either alone keeps the order active.
    const next = { ...order, [flag]: value };
    const finishes = next.shipped && next.paid && !order.completed_at;
    setLocalOrders((current) =>
      current.map((o) =>
        o.id === order.id
          ? { ...next, ...(finishes ? { completed_at: new Date().toISOString() } : {}) }
          : o
      )
    );
    startTransition(async () => {
      const result = await setGolfTownOrderFlag(order.id, flag, value);
      if (!result.ok) {
        setLocalOrders(previous);
        toast.error(result.error ?? "Couldn't save.");
      }
    });
  }

  function restore(order: GolfTownOrder) {
    startTransition(async () => {
      const result = await restoreGolfTownOrder(order.id);
      if (!result.ok) toast.error(result.error ?? "Couldn't restore the order.");
    });
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load the queue: {loadError}</p>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {active.length} in the queue
        </h2>
        <Button size="sm" className="rounded-full" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          Add Order
        </Button>
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm italic text-muted-foreground">No orders in the queue</p>
          <Button size="sm" className="rounded-full" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            Add Order
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3" onDragEnd={() => { setDragId(null); setDropIndex(null); }}>
          {(() => {
            // Portal grouping: green ready-for-pickup on top, yellow
            // payment-required next, everything else under In progress.
            const isReadyFn = (o: GolfTownOrder) => o.printed && !o.shipped;
            const isPayDueFn = (o: GolfTownOrder) => !isReadyFn(o) && o.invoiced && !o.paid;
            const readyList = isStaff ? [] : active.filter(isReadyFn);
            const payList = isStaff ? [] : active.filter(isPayDueFn);
            const restList = isStaff
              ? active
              : active.filter((o) => !isReadyFn(o) && !isPayDueFn(o));
            const displayList = isStaff ? active : [...readyList, ...payList, ...restList];
            return displayList.map((order, index) => {
            const isReady = !isStaff && isReadyFn(order);
            const isPayDue = !isStaff && isPayDueFn(order);
            return (
              <div key={order.id}>
                {!isStaff && readyList.length > 0 && index === 0 && (
                  <p className="mb-1 text-sm font-semibold text-success">Ready For Pick-Up</p>
                )}
                {!isStaff && payList.length > 0 && index === readyList.length && (
                  <p className={cn("mb-1 text-sm font-semibold text-warning", index > 0 && "mt-3")}>
                    Payment Required
                  </p>
                )}
                {!isStaff &&
                  restList.length > 0 &&
                  (readyList.length > 0 || payList.length > 0) &&
                  index === readyList.length + payList.length && (
                    <p className="mb-1 mt-3 text-sm font-medium text-muted-foreground">
                      In progress
                    </p>
                  )}
                {dropIndex === index && dragId && (
                  <div className="mb-1.5 h-0.5 rounded bg-primary" aria-hidden />
                )}
                <div
                  onDragOver={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const before = e.clientY < rect.top + rect.height / 2;
                    setDropIndex(before ? index : index + 1);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(dropIndex ?? index);
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a,button,label,input,[data-drag-handle]"))
                      return;
                    // Portal: staff-created orders are read-only to Matt.
                    if (!isStaff && order.submitted_by !== "golftown") return;
                    setEditing(order);
                  }}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors duration-150 hover:border-foreground/15",
                    !isStaff && order.submitted_by === "golftown" && "cursor-pointer",
                    // Portal: ready-for-pickup glows green, unpaid invoices
                    // glow yellow.
                    isReady &&
                      "border-success/60 bg-success/10 hover:border-success",
                    isPayDue &&
                      "border-warning/60 bg-warning/10 hover:border-warning",
                    dragId === order.id && "border-primary/50 opacity-60"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Portal: make Matt's own (editable) orders visibly so. */}
                    {!isStaff && order.submitted_by === "golftown" && (
                      <span className="order-last ml-auto flex items-center gap-1 self-start text-xs text-muted-foreground">
                        <Pencil className="h-3 w-3" />
                        Edit
                      </span>
                    )}
                    {isStaff && (
                      <>
                        <span
                          data-drag-handle
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            setDragId(order.id);
                          }}
                          className="hidden shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing md:block"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="h-5 w-5" />
                        </span>
                        <span className="w-5 shrink-0 text-sm tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                      </>
                    )}
                    <ArtworkThumb order={order} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-snug">
                        {order.end_customer}
                        {isStaff && order.submitted_by === "golftown" && (
                          <span className="ml-2 align-middle text-[11px] font-normal text-muted-foreground">
                            via Golf Town
                          </span>
                        )}
                      </p>
                      {/* The print spec is what Rob works from — make it loud. */}
                      <p className="mt-0.5 text-sm">
                        <span className="font-bold text-primary">
                          {order.quantity_dozen} dz
                        </span>
                        {order.ball_type && (
                          <>
                            <span className="text-muted-foreground"> · </span>
                            <span className="font-semibold">{order.ball_type}</span>
                          </>
                        )}
                        <span className="text-muted-foreground"> · </span>
                        <span className="font-bold text-warning">
                          {order.imprint_sides === 2 ? "Double" : "Single"} sided
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-3">
                        {isStaff && order.invoice_url && (
                          <a
                            href={order.invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            draggable={false}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-primary"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            Invoice
                          </a>
                        )}
                        {isStaff && (
                          <a
                            href={`/tools/golf-town-queue/${order.id}/print`}
                            target="_blank"
                            rel="noreferrer"
                            draggable={false}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-primary"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Work order
                          </a>
                        )}
                        <DatePill dateNeeded={order.date_needed} />
                      </div>
                      {order.drop_off_expected && (
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs tabular-nums",
                            // Drop-off date passed but balls still not here:
                            // that's the thing Rob needs to chase.
                            !order.balls_received &&
                              parseISO(order.drop_off_expected) < startOfDay(new Date())
                              ? "font-medium text-warning"
                              : "text-muted-foreground"
                          )}
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Drop-off {format(parseISO(order.drop_off_expected), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:pl-[3.75rem]">
                    {FLAGS.map((flag) => (
                      <label
                        key={flag.key}
                        className={cn(
                          "flex items-center gap-1.5",
                          isStaff ? "cursor-pointer" : "cursor-default"
                        )}
                      >
                        <Checkbox
                          checked={order[flag.key]}
                          // Status flags are production state — read-only on
                          // the portal (also unenforceable there: portal has
                          // no flag action).
                          disabled={!isStaff}
                          onCheckedChange={(checked) =>
                            isStaff && toggleFlag(order, flag.key, checked === true)
                          }
                        />
                        <span
                          className={cn(
                            "text-xs",
                            order[flag.key] ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {flag.label}
                        </span>
                      </label>
                    ))}
                    {/* Portal: pay button when staff has attached an invoice. */}
                    {!isStaff && order.invoice_url && (
                      <a
                        href={order.invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="ml-auto flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        View invoice
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
            });
          })()}
          {dropIndex === active.length && dragId && (
            <div className="h-0.5 rounded bg-primary" aria-hidden />
          )}
          {/* Drop zone after the last card */}
          {dragId && (
            <div
              className="h-6"
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndex(active.length);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(active.length);
              }}
            />
          )}
        </div>
      )}

      {completed.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCompletedOpen((v) => !v)}
            className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", !completedOpen && "-rotate-90")}
            />
            Finished Orders ({completed.length})
          </button>
          {completedOpen && (
            <div className="flex flex-col divide-y rounded-xl border">
              {completed.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-3 px-4 py-2 text-sm opacity-60"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{order.end_customer}</span>
                    <span className="text-muted-foreground">
                      {" "}· {order.quantity_dozen} dz
                      {order.ball_type && ` · ${order.ball_type}`}
                      {order.completed_at &&
                        ` · picked up ${format(parseISO(order.completed_at), "MMM d")}`}
                    </span>
                  </span>
                  {isStaff && (
                    <>
                      <a
                        href={`/tools/golf-town-queue/${order.id}/print`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-primary"
                      >
                        <Printer className="h-3 w-3" />
                        Work order
                      </a>
                      <button
                        type="button"
                        onClick={() => restore(order)}
                        className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editing && (
        <OrderSheet
          order={editing === "new" ? null : editing}
          organizationId={organizationId}
          mode={mode}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function OrderSheet({
  order,
  organizationId,
  mode,
  onClose,
}: {
  order: GolfTownOrder | null;
  organizationId: string;
  mode: "staff" | "portal";
  onClose: () => void;
}) {
  const isStaff = mode === "staff";
  const [endCustomer, setEndCustomer] = useState(order?.end_customer ?? "");
  const [ballType, setBallType] = useState(order?.ball_type ?? "");
  const [quantity, setQuantity] = useState(order ? String(order.quantity_dozen) : "");
  const [sides, setSides] = useState<1 | 2>(order?.imprint_sides === 2 ? 2 : 1);
  const [dateNeeded, setDateNeeded] = useState(order?.date_needed ?? "");
  const [dropOff, setDropOff] = useState(order?.drop_off_expected ?? "");
  const [invoiceUrl, setInvoiceUrl] = useState(order?.invoice_url ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [contact, setContact] = useState(order?.contact ?? "");
  // Existing artwork (edit) or a freshly picked file (uploads on save).
  const [existingArtwork, setExistingArtwork] = useState<{
    path: string;
    filename: string;
  } | null>(
    order?.artwork_path
      ? { path: order.artwork_path, filename: order.artwork_filename ?? "artwork" }
      : null
  );
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [artDragOver, setArtDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function acceptFile(file: File | null | undefined) {
    if (!file) return;
    if (!ACCEPTED_EXTENSIONS.has(fileExtension(file.name))) {
      toast.error("Use a PDF, AI, EPS, SVG, PNG, or JPG file.");
      return;
    }
    if (file.size > MAX_ARTWORK_BYTES) {
      toast.error("Artwork must be under 25MB.");
      return;
    }
    setPickedFile(file);
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    acceptFile(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      let artworkPath = existingArtwork?.path ?? null;
      let artworkFilename = existingArtwork?.filename ?? null;

      if (pickedFile) {
        if (isStaff) {
          const supabase = createClient();
          const path = `${organizationId}/${crypto.randomUUID()}-${pickedFile.name}`;
          const { error } = await supabase.storage
            .from("golf-town-artwork")
            .upload(path, pickedFile, {
              contentType: pickedFile.type || "application/octet-stream",
            });
          if (error) {
            toast.error(`Couldn't upload the artwork: ${error.message}`);
            return;
          }
          artworkPath = path;
          artworkFilename = pickedFile.name;
        } else {
          // Portal uploads go through the cookie-gated route handler —
          // no Supabase key in the portal browser.
          const form = new FormData();
          form.append("file", pickedFile);
          const res = await fetch("/golftown/upload", { method: "POST", body: form });
          const body = (await res.json()) as { path?: string; filename?: string; error?: string };
          if (!res.ok || !body.path) {
            toast.error(body.error ?? "Couldn't upload the artwork.");
            return;
          }
          artworkPath = body.path;
          artworkFilename = body.filename ?? pickedFile.name;
        }
      }

      const input: OrderInput = {
        endCustomer,
        ballType,
        quantityDozen: parseInt(quantity, 10) || 1,
        imprintSides: sides,
        dateNeeded: dateNeeded || null,
        dropOffExpected: dropOff || null,
        artworkPath,
        artworkFilename,
        notes,
        contact,
        invoiceUrl: isStaff ? invoiceUrl || null : null,
      };
      const result = order
        ? isStaff
          ? await updateGolfTownOrder(order.id, input)
          : await portalUpdateOrder(order.id, input)
        : isStaff
          ? await createGolfTownOrder(input)
          : await portalCreateOrder(input);
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't save the order.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!order) return;
    startTransition(async () => {
      const result = await deleteGolfTownOrder(order.id);
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't delete the order.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const attachedName = pickedFile?.name ?? existingArtwork?.filename ?? null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? "Edit order" : "New order"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gtq-customer" className="text-xs text-muted-foreground">
              End customer
            </Label>
            <Input
              id="gtq-customer"
              autoFocus
              required
              value={endCustomer}
              onChange={(e) => setEndCustomer(e.target.value)}
              placeholder="e.g. Shaughnessy G&CC"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gtq-ball" className="text-xs text-muted-foreground">
              Ball type
            </Label>
            <Input
              id="gtq-ball"
              list="gtq-ball-types"
              value={ballType}
              onChange={(e) => setBallType(e.target.value)}
              placeholder="e.g. TaylorMade Distance +"
            />
            <datalist id="gtq-ball-types">
              {BALL_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gtq-qty" className="text-xs text-muted-foreground">
                Quantity (dozens)
              </Label>
              <Input
                id="gtq-qty"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gtq-date" className="text-xs text-muted-foreground">
                Date needed
              </Label>
              <Input
                id="gtq-date"
                type="date"
                value={dateNeeded}
                onChange={(e) => setDateNeeded(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gtq-dropoff" className="text-xs text-muted-foreground">
                Balls dropped off (expected)
              </Label>
              <Input
                id="gtq-dropoff"
                type="date"
                value={dropOff}
                onChange={(e) => setDropOff(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Imprint</Label>
            {/* Same segmented toggle as the Golf Town Invoice calculator. */}
            <div className="flex w-fit overflow-hidden rounded-lg border">
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSides(n)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    sides === n
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {n === 1 ? "Single sided" : "Double sided"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Artwork</Label>
            {attachedName ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="min-w-0 truncate">{attachedName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPickedFile(null);
                    setExistingArtwork(null);
                  }}
                  className="shrink-0 text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setArtDragOver(true);
                }}
                onDragLeave={() => setArtDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setArtDragOver(false);
                  acceptFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex w-full items-center justify-center rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground",
                  artDragOver && "border-primary bg-primary/10 text-primary"
                )}
              >
                {artDragOver ? "Drop it here" : "Choose file… or drag & drop"}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ai,.eps,.svg,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFilePick}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gtq-notes" className="text-xs text-muted-foreground">
              Notes
            </Label>
            <Textarea
              id="gtq-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gtq-contact" className="text-xs text-muted-foreground">
              Contact at Golf Town (optional)
            </Label>
            <Input
              id="gtq-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          {isStaff && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gtq-invoice" className="text-xs text-muted-foreground">
                Invoice link (optional) — shown to Golf Town as a pay button
              </Label>
              <Input
                id="gtq-invoice"
                type="url"
                placeholder="https://..."
                value={invoiceUrl}
                onChange={(e) => setInvoiceUrl(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              {order && isStaff && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  render={
                    <a
                      href={`/tools/golf-town-queue/${order.id}/print`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <Printer className="h-3.5 w-3.5" />
                  Work order
                </Button>
              )}
            {order && isStaff ? (
              confirmDelete ? (
                <span className="flex items-center gap-2 text-xs">
                  Delete this order?
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="font-medium text-destructive hover:underline"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete order
                </button>
              )
            ) : (
              <span />
            )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-full" disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {order ? "Save" : "Add to queue"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
