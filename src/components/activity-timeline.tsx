"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityClusterItem } from "@/components/activity-cluster-item";
import type { DayGroup } from "@/lib/activity-grouping";

const PAGE_SIZE = 5;

export function ActivityTimeline({ days }: { days: DayGroup[] }) {
  const [visibleCount, setVisibleCount] = useState(Math.min(PAGE_SIZE, days.length));
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, days.length));
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [days.length]);

  const visibleDays = days.slice(0, visibleCount);

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-24 text-center">
        <p className="font-medium">Nothing here yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          As your team creates projects, posts updates, and completes tasks, it&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {visibleDays.map((day) => (
        <section key={day.key} className="flex flex-col gap-1">
          <h2 className="px-2 text-base font-semibold tracking-tight">{day.label}</h2>
          <div className="relative">
            <div className="absolute bottom-2 left-6 top-2 w-px bg-border" />
            <div className="flex flex-col">
              {day.clusters.map((cluster) => (
                <ActivityClusterItem key={cluster.key} cluster={cluster} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {visibleCount < days.length ? (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <span className="text-sm text-muted-foreground">Loading more…</span>
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground/70">
          You&apos;re all caught up.
        </p>
      )}
    </div>
  );
}
