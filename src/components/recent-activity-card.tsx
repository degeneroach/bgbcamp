import Link from "next/link";
import { ActivityItem, type ActivityEventWithRelations } from "@/components/activity-item";

export function RecentActivityCard({
  events,
  viewAllHref,
}: {
  events: ActivityEventWithRelations[];
  viewAllHref: string;
}) {
  // Deliberately recessed: a soft, near-background container so the task
  // lists remain the primary focus and this reads as secondary context.
  return (
    <section className="mt-2 flex flex-col rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
      <div className="mb-0.5 flex items-center justify-between">
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
      <div className="flex flex-col">
        {events.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          events.map((event) => <ActivityItem key={event.id} event={event} />)
        )}
      </div>
    </section>
  );
}
