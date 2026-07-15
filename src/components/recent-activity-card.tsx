"use client";

import { useState } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { type ActivityEventWithRelations } from "@/components/activity-item";
import { activitySummary } from "@/lib/activity-summary";
import { timeAgo } from "@/lib/format";
import { getUserAccent } from "@/lib/user-colors";
import { displayName } from "@/lib/display-name";
import { cn } from "@/lib/utils";

const INITIAL_COUNT = 6;
const PAGE_SIZE = 12;

function ActivityRow({
  event,
  mirrored,
}: {
  event: ActivityEventWithRelations;
  mirrored: boolean;
}) {
  const accent = getUserAccent(event.actor?.email || event.actor?.full_name || null);
  return (
    <div className={cn("flex items-start gap-2", mirrored && "flex-row-reverse text-right")}>
      <UserAvatar
        name={event.actor?.full_name}
        email={event.actor?.email ?? ""}
        avatarUrl={event.actor?.avatar_url}
        className="mt-0.5 h-5 w-5 shrink-0 text-[9px]"
      />
      <div className="min-w-0 text-xs leading-relaxed">
        <span className="font-semibold" style={{ color: accent.text }}>
          {displayName(event.actor)}
        </span>{" "}
        <span className="text-foreground/80">{activitySummary(event)}</span>
        <span className="whitespace-nowrap text-muted-foreground/70"> · {timeAgo(event.created_at)}</span>
      </div>
    </div>
  );
}

// Recessed secondary panel below the task board. Entries alternate sides of
// a center line whenever the actor changes (matching the main timeline), so
// a glance shows where someone else picked up.
export function RecentActivityCard({
  events,
  viewAllHref,
}: {
  events: ActivityEventWithRelations[];
  viewAllHref: string;
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const visible = events.slice(0, visibleCount);

  // Precompute alternating sides across the visible window: flip whenever
  // the actor changes from the previous entry.
  let side: "left" | "right" = "left";
  let prevActor: string | null = null;
  const sides = visible.map((event) => {
    const actorKey = event.actor_id ?? "unknown";
    if (prevActor !== null && actorKey !== prevActor) {
      side = side === "left" ? "right" : "left";
    }
    prevActor = actorKey;
    return side;
  });

  return (
    <section className="mt-2 flex flex-col rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent activity
        </span>
        <Link
          href={viewAllHref}
          className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {visible.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <>
          {/* Mobile: simple left rail. */}
          <div className="flex flex-col gap-2.5 sm:hidden">
            {visible.map((event) => (
              <ActivityRow key={event.id} event={event} mirrored={false} />
            ))}
          </div>

          {/* Desktop: alternating two-sided layout around a center line. */}
          <div className="relative hidden sm:block">
            <div className="absolute bottom-1 left-1/2 top-1 w-px -translate-x-1/2 bg-border/70" />
            <div className="flex flex-col gap-2">
              {visible.map((event, i) => (
                <div
                  key={event.id}
                  className="grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-start"
                >
                  <div className="min-w-0">
                    {sides[i] === "left" && <ActivityRow event={event} mirrored />}
                  </div>
                  <div className="flex justify-center pt-2">
                    <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-border" />
                  </div>
                  <div className="min-w-0">
                    {sides[i] === "right" && <ActivityRow event={event} mirrored={false} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {visibleCount < events.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="mt-3 w-full rounded-md border border-border/60 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              View more activity
            </button>
          )}
        </>
      )}
    </section>
  );
}
