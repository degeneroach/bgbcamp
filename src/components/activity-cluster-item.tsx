"use client";

import { createElement, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { ActivityCommentPreview } from "@/components/activity-comment-preview";
import { getActivityIcon, describeActivity } from "@/lib/activity-display";
import { timeAgo } from "@/lib/format";
import { getUserAccent } from "@/lib/user-colors";
import { cn } from "@/lib/utils";
import type { ActivityCluster } from "@/lib/activity-grouping";

const COMMENT_ACTIONS = new Set(["task_comment.created", "post_comment.created"]);

function ActorName({ actor }: { actor: ActivityCluster["actor"] }) {
  const accent = getUserAccent(actor?.email || actor?.full_name || null);
  return (
    <span className="font-semibold" style={{ color: accent.text }}>
      {actor?.full_name || actor?.email || "Someone"}
    </span>
  );
}

function ActivityLine({
  event,
  showTime = true,
}: {
  event: ActivityCluster["events"][number];
  showTime?: boolean;
}) {
  const display = describeActivity(event, event.project?.slug ?? null);
  const metadata = event.metadata as Record<string, string | undefined>;
  const isComment = COMMENT_ACTIONS.has(event.action);
  const imageUrl = event.action === "task.image_added" ? metadata.imageUrl : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-sm leading-snug">
        <ActorName actor={event.actor} /> {display.verb}{" "}
        {display.itemLabel &&
          (display.itemHref ? (
            <Link href={display.itemHref} className="font-medium hover:underline">
              &ldquo;{display.itemLabel}&rdquo;
            </Link>
          ) : (
            <span className="font-medium">&ldquo;{display.itemLabel}&rdquo;</span>
          ))}
        {display.detail && <span className="text-muted-foreground"> {display.detail}</span>}
      </p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {event.project && (
          <Link href={`/projects/${event.project.slug}`} className="hover:underline">
            {event.project.name}
          </Link>
        )}
        {event.project && showTime && <span>·</span>}
        {showTime && <span>{timeAgo(event.created_at)}</span>}
      </div>
      {isComment && metadata.bodyPreview && <ActivityCommentPreview text={metadata.bodyPreview} />}
      {imageUrl && (
        <div className="relative mt-1.5 h-20 w-20 overflow-hidden rounded-lg border">
          <Image src={imageUrl} alt="Attached image" fill sizes="80px" className="object-cover" />
        </div>
      )}
    </div>
  );
}

export function ActivityClusterItem({ cluster }: { cluster: ActivityCluster }) {
  const [expanded, setExpanded] = useState(false);
  const primary = cluster.events[0];
  const count = cluster.events.length;

  return (
    <div className="relative flex animate-in fade-in gap-3 rounded-xl px-2 py-3 duration-300 hover:bg-muted/40">
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
        {createElement(getActivityIcon(cluster.action), {
          className: "h-3.5 w-3.5 text-muted-foreground",
        })}
      </div>

      {count === 1 ? (
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <UserAvatar
            name={primary.actor?.full_name}
            email={primary.actor?.email ?? ""}
            avatarUrl={primary.actor?.avatar_url}
            className="mt-0.5 h-6 w-6 shrink-0"
          />
          <ActivityLine event={primary} />
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-start gap-2 text-left"
          >
            <UserAvatar
              name={primary.actor?.full_name}
              email={primary.actor?.email ?? ""}
              avatarUrl={primary.actor?.avatar_url}
              className="mt-0.5 h-6 w-6 shrink-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm leading-snug">
                <ActorName actor={primary.actor} /> {describeActivity(primary, null).verb}{" "}
                <span className="font-medium">{count} items</span>
              </p>
              <span className="text-xs text-muted-foreground">{timeAgo(primary.created_at)}</span>
            </div>
            <ChevronDown
              className={cn(
                "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
            />
          </button>
          {expanded && (
            <div className="ml-8 flex flex-col gap-2 border-l pl-3">
              {cluster.events.map((event) => (
                <ActivityLine key={event.id} event={event} showTime={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
