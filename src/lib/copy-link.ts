"use client";

import { toast } from "sonner";

// Copies a URL with a toast. The clipboard API refuses writes while the
// document isn't focused, and when triggered from a closing menu the browser
// is mid-way through moving focus. Wait a beat, then fall back to execCommand.
export function copyShareLink(url: string) {
  setTimeout(async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      textarea.remove();
      if (!ok) {
        toast.error("Couldn't copy the link.");
        return;
      }
    }
    toast.success("Link copied — paste it to a teammate.");
  }, 150);
}
