import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { activitySummary } from "@/lib/activity-summary";
import { timeAgo } from "@/lib/format";
import { getUserAccent, getUserOffset } from "@/lib/user-colors";
import type { ActivityEvent, Profile } from "@/types/database";

export interface ActivityEventWithRelations extends ActivityEvent {
  actor: Profile | null;
  project?: { name: string; slug: string } | null;
}

export function ActivityItem({
  event,
  showProject = false,
}: {
  event: ActivityEventWithRelations;
  showProject?: boolean;
}) {
  const actorName = event.actor?.full_name || event.actor?.email || "Someone";
  const accentKey = event.actor?.email || event.actor?.full_name || null;
  const accent = getUserAccent(accentKey);
  const offset = getUserOffset(accentKey);

  return (
    <div
      className="flex items-start gap-3 border-l-2 py-2.5 pl-3"
      style={{ borderColor: accent.bar, marginLeft: offset }}
    >
      <UserAvatar
        name={event.actor?.full_name}
        email={event.actor?.email ?? ""}
        avatarUrl={event.actor?.avatar_url}
        className="mt-0.5 h-7 w-7"
      />
      <div className="flex flex-col text-sm">
        <span>
          <span className="font-semibold" style={{ color: accent.text }}>
            {actorName}
          </span>{" "}
          {activitySummary(event)}
          {showProject && event.project && (
            <>
              {" "}
              in{" "}
              <Link href={`/projects/${event.project.slug}`} className="font-medium hover:underline">
                {event.project.name}
              </Link>
            </>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</span>
      </div>
    </div>
  );
}
