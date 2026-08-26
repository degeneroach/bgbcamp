import { notFound } from "next/navigation";
import { format, parseISO, startOfDay } from "date-fns";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { WorkOrderPrintControls } from "@/components/golf-town-work-order";
import type { GolfTownOrder } from "@/types/database";

export const metadata = {
  title: "Work Order · BGBCamp",
};

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "svg"]);

function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

// Deliberately hard-coded light palette: this sheet prints black-on-white
// regardless of the viewer's app theme.
export default async function WorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("golf_town_orders")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!data) notFound();
  const order = data as GolfTownOrder;

  const artworkUrl = order.artwork_path
    ? supabase.storage.from("golf-town-artwork").getPublicUrl(order.artwork_path).data.publicUrl
    : null;
  const ext = fileExtension(order.artwork_filename ?? order.artwork_path ?? "");
  const isImage = Boolean(artworkUrl) && IMAGE_EXTENSIONS.has(ext);

  const dueDate = order.date_needed ? parseISO(order.date_needed) : null;
  const pastDue = dueDate !== null && dueDate < startOfDay(new Date());
  const balls = order.quantity_dozen * 12;

  return (
    <>
      {/* Route-scoped print rules; globals' print styles are untouched. */}
      <style>{`
        @page { size: letter; margin: 0.5in; }
        @media print {
          html, body { background: #ffffff !important; }
          .wo-sheet { margin: 0 !important; width: auto !important; min-height: 0 !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>

      <WorkOrderPrintControls />

      <div className="wo-sheet mx-auto my-8 flex w-[8.5in] max-w-full min-h-[11in] flex-col bg-white p-[0.5in] font-sans text-[12pt] leading-relaxed text-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex min-h-[1.25in] items-start justify-between gap-6 border-b border-[#111111] pb-4">
          <div className="shrink-0">
            {isImage && artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                data-wo-artwork
                src={artworkUrl}
                alt={order.artwork_filename ?? "Artwork"}
                className="max-h-[1.5in] max-w-[2.5in] object-contain object-left"
              />
            ) : (
              <div className="flex h-[1.5in] w-[2.5in] flex-col items-center justify-center gap-1 border border-dashed border-[#999999] px-3 text-center">
                {order.artwork_path ? (
                  <>
                    <span className="text-[14pt] font-bold uppercase">{ext || "file"}</span>
                    <span className="max-w-full truncate text-[9pt]">
                      {order.artwork_filename ?? order.artwork_path}
                    </span>
                    <span className="text-[9pt] text-[#666666]">
                      Open the artwork file to view — not previewable here.
                    </span>
                  </>
                ) : (
                  <span className="text-[14pt] font-bold">NO ARTWORK ON FILE</span>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[16pt] font-bold tracking-[0.25em]">GOLF TOWN</p>
            <p className="mt-1 text-[11pt] tracking-[0.15em]">WORK ORDER</p>
            <p className="mt-1 text-[9pt] text-[#666666]">
              Printed {format(new Date(), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="text-[9pt] uppercase tracking-[0.15em] text-[#666666]">End customer</p>
            <p className="text-[16pt] font-bold">{order.end_customer}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-[9pt] uppercase tracking-[0.15em] text-[#666666]">Quantity</p>
              <p className="text-[13pt]">
                {order.quantity_dozen} dozen ({balls.toLocaleString()} balls)
              </p>
            </div>
            <div>
              <p className="text-[9pt] uppercase tracking-[0.15em] text-[#666666]">Ball type</p>
              <p className="text-[13pt]">{order.ball_type || "—"}</p>
            </div>
            <div>
              <p className="text-[9pt] uppercase tracking-[0.15em] text-[#666666]">Imprint</p>
              <p className="text-[13pt]">
                {order.imprint_sides === 2
                  ? "Double sided (2 pole locations — 2 hits per ball)"
                  : "Single sided (1 location)"}
              </p>
            </div>
            <div>
              <p className="text-[9pt] uppercase tracking-[0.15em] text-[#666666]">Date needed</p>
              <p className="text-[13pt] font-bold">
                {dueDate ? format(dueDate, "EEEE, MMMM d, yyyy") : "Not specified"}
                {pastDue && " — PAST DUE"}
              </p>
            </div>
            <div>
              <p className="text-[9pt] uppercase tracking-[0.15em] text-[#666666]">Contact</p>
              <p className="text-[13pt]">{order.contact || "—"}</p>
            </div>
          </div>
        </div>

        {/* Notes — always rendered so Rob can hand-write on the sheet. */}
        <div className="mt-5 border-t border-[#dddddd] pt-4">
          <p className="text-[9pt] uppercase tracking-[0.15em] text-[#666666]">Order notes</p>
          {order.notes ? (
            <p className="mt-1 max-h-[3in] overflow-hidden whitespace-pre-wrap text-[12pt]">
              {order.notes}
            </p>
          ) : (
            <p className="mt-1 text-[12pt] italic text-[#666666]">None</p>
          )}
        </div>

        {/* Footer pinned to the bottom of the sheet */}
        <div className="mt-auto border-t border-[#dddddd] pt-2">
          <p className="text-[8pt] text-[#666666]">
            Custom Golf Ball Printing · bgbcamp.com · Order {order.id.slice(0, 8)}
          </p>
        </div>
      </div>
    </>
  );
}
