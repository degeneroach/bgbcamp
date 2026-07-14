"use client";

import { createElement, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { getActivityIcon, getActivityColor, describeActivity } from "@/lib/activity-display";
import { markActivitySeen, markAllActivitySeen } from "@/app/(app)/activity/actions";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { cn } from "@/lib/utils";
import type { ActivityEventFull } from "@/lib/activity-grouping";

// Basecamp-style "New for you": activity by teammates you haven't seen yet,
// pinned above the timeline. Clicking the dot marks an entry seen and it
// drops into the regular timeline below on the next render.
export function NewForYou({ events }: { events: ActivityEventFull[] }) {
  const [visible, removeOptimistic] = useOptimistic(
    events,
    (current, seenId: string) => current.filter((e) => e.id !== seenId)
  );
  const [, startTransition] = useTransition();
  const router = useRouter();

  if (visible.length === 0) return null;

  function dismiss(eventId: string) {
    startTransition(async () => {
      removeOptimistic(eventId);
      await markActivitySeen(eventId);
    });
  }

  function dismissAll() {
    startTransition(async () => {
      for (const event of visible) removeOptimistic(event.id);
      await markAllActivitySeen(visible.map((e) => e.id));
    });
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <h2 className="text-sm font-semibold">
          New for you <span className="font-normal text-muted-foreground">({visible.length})</span>
        </h2>
        <button
          type="button"
          onClick={dismissAll}
          className="text-xs text-muted-foreground hover:underline"
        >
          Mark all seen
        </button>
      </div>
      <div className="flex flex-col divide-y">
        {visible.map((event) => {
          const display = describeActivity(event, event.project?.slug ?? null);
          const href =
            display.itemHref ?? (event.project ? `/projects/${event.project.slug}` : null);
          const color = getActivityColor(event.action);
          return (
            <div
              key={event.id}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a,button")) return;
                if (href) router.push(href);
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40",
                href && "cursor-pointer"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  color.bg
                )}
              >
                {createElement(getActivityIcon(event.action), {
                  className: cn("h-3.5 w-3.5", color.text),
                })}
              </div>
              <UserAvatar
                name={event.actor?.full_name}
                email={event.actor?.email ?? ""}
                avatarUrl={event.actor?.avatar_url}
                className="h-6 w-6 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-semibold">{displayName(event.actor)}</span>{" "}
                  {display.verb}{" "}
                  {display.itemLabel &&
                    (href ? (
                      <Link href={href} className="font-medium hover:underline">
                        &ldquo;{display.itemLabel}&rdquo;
                      </Link>
                    ) : (
                      <span className="font-medium">&ldquo;{display.itemLabel}&rdquo;</span>
                    ))}
                  {display.detail && (
                    <span className="text-muted-foreground"> {display.detail}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {event.project?.name}
                  {event.project && " · "}
                  {timeAgo(event.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(event.id)}
                title="Mark seen"
                aria-label="Mark seen"
                className="group flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-muted"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-primary transition-transform group-hover:scale-125" />
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
