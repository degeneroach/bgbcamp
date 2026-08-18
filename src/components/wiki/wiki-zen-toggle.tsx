"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Focus, Minimize2 } from "lucide-react";

// Distraction-free reading: toggles a root attribute that CSS uses to hide
// the app header and wiki sidebar and center the reading paper. A small
// floating button (or Esc) brings everything back.
export function WikiZenToggle() {
  const [zen, setZen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (zen) {
      root.setAttribute("data-wiki-zen", "");
    } else {
      root.removeAttribute("data-wiki-zen");
    }
    return () => root.removeAttribute("data-wiki-zen");
  }, [zen]);

  useEffect(() => {
    if (!zen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zen]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => setZen(true)}
        title="Distraction-free reading"
      >
        <Focus className="h-3.5 w-3.5" />
        Focus
      </Button>
      {zen && (
        <button
          type="button"
          onClick={() => setZen(false)}
          title="Exit focus mode (Esc)"
          aria-label="Exit focus mode"
          className="fixed right-4 top-4 z-[80] flex h-9 w-9 items-center justify-center rounded-full border bg-card/90 text-muted-foreground shadow-md backdrop-blur transition-colors hover:text-foreground print:hidden"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
