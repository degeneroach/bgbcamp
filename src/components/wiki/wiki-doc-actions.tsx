"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Check, FileDown } from "lucide-react";
import { toast } from "sonner";

export function WikiDocActions({ docTitle }: { docTitle: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied — paste it to a teammate.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  function downloadPdf() {
    // Browser print-to-PDF; the print stylesheet strips nav/sidebar/buttons.
    // Temporarily set the tab title so the suggested filename is the doc name.
    const previous = document.title;
    document.title = docTitle;
    window.print();
    document.title = previous;
  }

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full" onClick={copyLink}>
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Link2 className="h-3.5 w-3.5" />}
        Share
      </Button>
      <Button variant="outline" size="sm" className="rounded-full" onClick={downloadPdf}>
        <FileDown className="h-3.5 w-3.5" />
        PDF
      </Button>
    </>
  );
}
