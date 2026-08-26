"use client";

import { useEffect, useRef } from "react";
import { Printer } from "lucide-react";

// Auto-fires window.print() once the artwork image has loaded (or errored,
// or when there's no image at all) — never before, or the logo would be
// missing from the printed sheet. Also the on-screen re-print button.
export function WorkOrderPrintControls() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const go = () => {
      if (fired.current) return;
      fired.current = true;
      // A beat for layout/paint so the print snapshot includes the image.
      setTimeout(() => window.print(), 250);
    };
    const img = document.querySelector<HTMLImageElement>("[data-wo-artwork]");
    if (!img) {
      go();
      return;
    }
    if (img.complete) {
      go();
      return;
    }
    img.addEventListener("load", go, { once: true });
    img.addEventListener("error", go, { once: true });
    return () => {
      img.removeEventListener("load", go);
      img.removeEventListener("error", go);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="fixed right-6 top-6 z-10 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#111] shadow-lg transition-opacity hover:opacity-90 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Print / Save as PDF
    </button>
  );
}
