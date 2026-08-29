"use client";

import { useRef, useState, useTransition } from "react";
import { Check, FileUp, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { sendInvoicesToDext, type DextCompany } from "@/app/(app)/tools/dext/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ACCEPTED = new Set(["pdf", "jpg", "jpeg", "png"]);

interface SentEntry {
  name: string;
  at: string;
}

const BOXES: { company: DextCompany; title: string; email: string; accent: string }[] = [
  {
    company: "bgci",
    title: "BIODEGRADABLE GOLF CANADA INC.",
    email: "mitch.bgci@dext.cc",
    accent: "text-success",
  },
  {
    company: "nonna",
    title: "(NONNA) 1486882 B.C. LTD.",
    email: "getnonna@dext.cc",
    accent: "text-primary",
  },
];

function DextBox({ company, title, email, accent }: (typeof BOXES)[number]) {
  const [dragOver, setDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState<SentEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(files: File[]) {
    if (files.length === 0) return;
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ACCEPTED.has(ext)) {
        toast.error(`"${file.name}" isn't a PDF, JPG, or PNG.`);
        return;
      }
    }
    startTransition(async () => {
      const form = new FormData();
      for (const file of files) form.append("files", file);
      const result = await sendInvoicesToDext(company, form);
      if (!result.ok) {
        toast.error(result.error ?? "Sending failed.");
        return;
      }
      const at = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      setSent((prev) => [...files.map((f) => ({ name: f.name, at })), ...prev].slice(0, 20));
      toast.success(
        `${files.length} file${files.length === 1 ? "" : "s"} sent to ${email}`
      );
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="text-center">
        <h2 className={cn("text-sm font-bold tracking-wide", accent)}>{title}</h2>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          submit(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-foreground/15 bg-muted/20 px-4 transition-colors hover:border-primary/50 hover:bg-primary/5",
          dragOver && "border-primary bg-primary/10",
          isPending && "opacity-70"
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Sending to Dext…</span>
          </>
        ) : (
          <>
            <FileUp className={cn("h-8 w-8", dragOver ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-medium">
              {dragOver ? "Drop to send" : "Drag & drop invoices here"}
            </span>
            <span className="text-xs text-muted-foreground">
              or click to browse · PDF, JPG, PNG · multiple files OK
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          submit(files);
        }}
      />

      {sent.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sent this session
          </p>
          {sent.map((entry, i) => (
            <p key={`${entry.name}-${i}`} className="flex items-center gap-1.5 text-xs">
              <Check className="h-3 w-3 shrink-0 text-success" />
              <span className="min-w-0 truncate">{entry.name}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">{entry.at}</span>
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DextDrop() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {BOXES.map((box) => (
        <DextBox key={box.company} {...box} />
      ))}
    </div>
  );
}
