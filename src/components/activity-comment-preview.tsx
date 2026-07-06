"use client";

import { useState } from "react";

export function ActivityCommentPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 160;

  return (
    <div className="mt-1.5 rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground/80">
      <p className={expanded ? "" : "line-clamp-2"}>{text}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
