"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { getActivityColor, getActivityIcon } from "@/lib/activity-display";
import { cn } from "@/lib/utils";

export interface TickerItem {
  id: string;
  actorName: string;
  actorEmail: string;
  avatarUrl: string | null;
  action: string;
  verb: string;
  itemLabel: string | null;
  itemHref: string | null;
  createdAt: string;
}

// Compact relative time for the ticker: "4s", "2m", "3h", "5d".
function shortAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Pump.fun-style live strip, toned down: one horizontal row of the newest
// org-wide activity, newest first, scrollable when it overflows.
export function ActivityTicker({ items }: { items: TickerItem[] }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  // Tick the "ago" labels, and re-pull server data so new comments anywhere
  // in BGBCamp appear without a manual reload.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 10_000);
    const refresh = setInterval(() => router.refresh(), 45_000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2" aria-label="Latest activity">
      <span className="flex shrink-0 items-center gap-1.5 pr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
      {/* Scrollbar hidden; the right-edge fade hints that more chips are
          tucked away (swipe / shift+scroll still works). */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 [mask-image:linear-gradient(to_right,black_93%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
        const Icon = getActivityIcon(item.action);
        const color = getActivityColor(item.action);
        const firstName = item.actorName.split(" ")[0];
        const tooltip = [item.actorName, item.verb, item.itemLabel].filter(Boolean).join(" ");
        const chipClass =
          "flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs";
        const inner = (
          <>
            <UserAvatar
              name={item.actorName}
              email={item.actorEmail}
              avatarUrl={item.avatarUrl}
              className="h-5 w-5 text-[9px]"
            />
            <span className="font-medium">{firstName}</span>
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                color.bg
              )}
            >
              <Icon className={cn("h-2.5 w-2.5", color.text)} />
            </span>
            {item.itemLabel && (
              <span className="max-w-[150px] truncate text-muted-foreground">
                {item.itemLabel}
              </span>
            )}
            <span
              className="tabular-nums text-muted-foreground/60"
              suppressHydrationWarning
            >
              {shortAgo(item.createdAt, now)}
            </span>
          </>
        );
        return item.itemHref ? (
          <Link
            key={item.id}
            href={item.itemHref}
            title={tooltip}
            className={cn(chipClass, "transition-colors hover:bg-accent/60")}
          >
            {inner}
          </Link>
        ) : (
          <span key={item.id} title={tooltip} className={chipClass}>
            {inner}
          </span>
        );
        })}
      </div>
    </div>
  );
}
