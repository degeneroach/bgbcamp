import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ActivityItem, type ActivityEventWithRelations } from "@/components/activity-item";

export function RecentActivityCard({
  events,
  viewAllHref,
}: {
  events: ActivityEventWithRelations[];
  viewAllHref: string;
}) {
  return (
    <Card className="flex flex-col p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold">Recent activity</span>
        <Link href={viewAllHref} className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="flex flex-col divide-y">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          events.map((event) => <ActivityItem key={event.id} event={event} />)
        )}
      </div>
    </Card>
  );
}
