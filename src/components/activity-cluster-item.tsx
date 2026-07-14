"use client";

import { createElement, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, Paperclip } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { ActivityCommentPreview } from "@/components/activity-comment-preview";
import { getActivityIcon, getActivityColor, describeActivity } from "@/lib/activity-display";
import { timeAgo } from "@/lib/format";
import { getUserAccent } from "@/lib/user-colors";
import { displayName } from "@/lib/display-name";
import { cn } from "@/lib/utils";
import type { ActivityCluster } from "@/lib/activity-grouping";

const COMMENT_ACTIONS = new Set(["task_comment.created", "post_comment.created"]);

function ActorName({ actor }: { actor: ActivityCluster["actor"] }) {
  const accent = getUserAccent(actor?.email || actor?.full_name || null);
  return (
    <span className="font-semibold" style={{ color: accent.text }}>
      {displayName(actor)}
    </span>
  );
}

function ActivityLine({
  event,
  showTime = true,
  side = "right",
}: {
  event: ActivityCluster["events"][number];
  showTime?: boolean;
  /** "left" = entry sits on the left of the timeline, so content is mirrored. */
  side?: "left" | "right";
}) {
  const display = describeActivity(event, event.project?.slug ?? null);
  const metadata = event.metadata as Record<string, string | undefined>;
  const isComment = COMMENT_ACTIONS.has(event.action);
  const imageUrl = event.action === "task.image_added" ? metadata.imageUrl : undefined;
  const fileUrl = event.action === "task.file_added" ? metadata.fileUrl : undefined;
  const mirrored = side === "left";

  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", mirrored && "items-end text-right")}>
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
      {fileUrl && metadata.fileName && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
        >
          <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{metadata.fileName}</span>
        </a>
      )}
    </div>
  );
}

export function ActivityClusterItem({
  cluster,
  side = "right",
}: {
  cluster: ActivityCluster;
  side?: "left" | "right";
}) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const primary = cluster.events[0];
  const count = cluster.events.length;
  const color = getActivityColor(cluster.action);

  const primaryDisplay = describeActivity(primary, primary.project?.slug ?? null);
  const primaryHref =
    primaryDisplay.itemHref ?? (primary.project ? `/projects/${primary.project.slug}` : null);

  // The whole row navigates to the item it signals; inner links/buttons
  // (item title, project, expand chevron) still win when clicked directly.
  function handleRowClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("a,button")) return;
    if (count === 1 && primaryHref) router.push(primaryHref);
  }

  const dot = (
    <div
      className={cn(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        color.bg
      )}
    >
      {createElement(getActivityIcon(cluster.action), {
        className: cn("h-3.5 w-3.5", color.text),
      })}
    </div>
  );

  function renderCard(cardSide: "left" | "right") {
    const mirrored = cardSide === "left";
    if (count === 1) {
      return (
        <div
          onClick={handleRowClick}
          className={cn(
            "flex min-w-0 animate-in fade-in items-start gap-2 rounded-xl px-2 py-2 duration-300 hover:bg-muted/40",
            primaryHref && "cursor-pointer",
            mirrored && "flex-row-reverse text-right"
          )}
        >
          <UserAvatar
            name={primary.actor?.full_name}
            email={primary.actor?.email ?? ""}
            avatarUrl={primary.actor?.avatar_url}
            className="mt-0.5 h-6 w-6 shrink-0"
          />
          <ActivityLine event={primary} side={cardSide} />
        </div>
      );
    }

    return (
      <div className="flex min-w-0 animate-in fade-in flex-col gap-1.5 rounded-xl px-2 py-2 duration-300 hover:bg-muted/40">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex w-full items-start gap-2 text-left",
            mirrored && "flex-row-reverse text-right"
          )}
        >
          <UserAvatar
            name={primary.actor?.full_name}
            email={primary.actor?.email ?? ""}
            avatarUrl={primary.actor?.avatar_url}
            className="mt-0.5 h-6 w-6 shrink-0"
          />
          <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", mirrored && "items-end")}>
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
          <div
            className={cn(
              "flex flex-col gap-2",
              mirrored ? "mr-8 border-r pr-3" : "ml-8 border-l pl-3"
            )}
          >
            {cluster.events.map((event) => (
              <ActivityLine key={event.id} event={event} showTime={false} side={cardSide} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: single left rail (side alternation needs the width to breathe). */}
      <div className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] py-1.5 sm:hidden">
        <div className="flex justify-center pt-2">{dot}</div>
        <div className="min-w-0">{renderCard("right")}</div>
      </div>

      {/* Desktop: alternating two-sided timeline. */}
      <div className="relative hidden grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] py-1.5 sm:grid">
        <div className="flex min-w-0 justify-end">{side === "left" && renderCard("left")}</div>
        <div className="flex justify-center pt-2">{dot}</div>
        <div className="min-w-0">{side === "right" && renderCard("right")}</div>
      </div>
    </>
  );
}
