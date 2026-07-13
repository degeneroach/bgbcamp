"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Zap } from "lucide-react";
import { setBoost, removeBoost } from "@/app/(app)/projects/[slug]/tasks/actions";
import { displayName } from "@/lib/display-name";
import { EMOJIS } from "@/lib/emojis";
import { cn } from "@/lib/utils";
import type { Boost, BoostEntityType, Profile } from "@/types/database";

export type BoostWithAuthor = Boost & { author: Profile | null };

// Basecamp-style boosts: each person can leave one emoji on a task or comment.
// Picking an emoji replaces your previous one; clicking your own chip removes it.
export function BoostBar({
  entityType,
  entityId,
  taskId,
  projectId,
  projectSlug,
  taskTitle,
  boosts,
  currentUserId,
  size = "md",
}: {
  entityType: BoostEntityType;
  entityId: string;
  taskId: string;
  projectId: string;
  projectSlug: string;
  taskTitle: string;
  boosts: BoostWithAuthor[];
  currentUserId: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handlePick(emoji: string) {
    setOpen(false);
    startTransition(async () => {
      await setBoost(projectId, projectSlug, taskId, taskTitle, entityType, entityId, emoji);
    });
  }

  function handleChipClick(boost: BoostWithAuthor) {
    if (boost.author_id !== currentUserId) return;
    startTransition(async () => {
      await removeBoost(entityType, entityId, projectSlug, taskId);
    });
  }

  const chipText = size === "sm" ? "text-sm" : "text-base";

  return (
    <div ref={containerRef} className="relative flex flex-wrap items-center gap-1">
      {boosts.map((boost) => {
        const own = boost.author_id === currentUserId;
        return (
          <button
            key={boost.id}
            type="button"
            disabled={isPending || !own}
            onClick={() => handleChipClick(boost)}
            title={
              own
                ? "Your boost — click to remove"
                : `${displayName(boost.author)} boosted`
            }
            className={cn(
              "flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5",
              chipText,
              own
                ? "cursor-pointer border-primary/40 bg-primary/5 hover:bg-primary/10"
                : "cursor-default"
            )}
          >
            <span className="leading-none">{boost.emoji}</span>
            <span className="text-[11px] text-muted-foreground">
              {displayName(boost.author).split(" ")[0]}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        title="Add a boost"
        aria-label="Add a boost"
        className={cn(
          "flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground",
          size === "sm" ? "text-[11px]" : "text-xs"
        )}
      >
        <Zap className="h-3 w-3" />
        Boost
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-50 grid w-max grid-cols-4 gap-1 rounded-lg border bg-popover p-2 shadow-md">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji.char}
              type="button"
              title={emoji.label}
              aria-label={emoji.label}
              className="flex h-9 w-9 items-center justify-center rounded-md text-xl leading-none hover:bg-muted"
              onClick={() => handlePick(emoji.char)}
            >
              {emoji.char}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
