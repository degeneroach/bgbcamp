import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { ActivityEvent, Profile } from "@/types/database";

export type ActivityEventFull = ActivityEvent & {
  actor: Profile | null;
  project: { slug: string; name: string } | null;
};

export interface DayGroup {
  key: string;
  label: string;
  clusters: ActivityCluster[];
}

export interface ActivityCluster {
  key: string;
  actor: Profile | null;
  action: string;
  events: ActivityEventFull[];
}

export function dayLabel(dateInput: string | Date): string {
  const date = startOfDay(new Date(dateInput));
  const today = startOfDay(new Date());
  const diff = differenceInCalendarDays(today, date);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return format(date, "EEEE");
  return format(date, "MMMM d, yyyy");
}

// Groups events by calendar day (newest first), then clusters *adjacent*
// events from the same actor performing the same action into a single
// collapsible entry (e.g. "Mitchell completed 16 tasks") — mirroring
// Basecamp's activity digest behavior. Adjacency (rather than a global
// group-by) keeps unrelated interleaved actions from a different person or
// action type from being folded into the same burst.
export function groupActivityByDay(events: ActivityEventFull[]): DayGroup[] {
  const byDay = new Map<string, ActivityEventFull[]>();

  for (const event of events) {
    const key = startOfDay(new Date(event.created_at)).toISOString();
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  const days = Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, dayEvents]) => ({
      key,
      label: dayLabel(key),
      clusters: clusterAdjacent(dayEvents),
    }));

  return days;
}

function clusterAdjacent(events: ActivityEventFull[]): ActivityCluster[] {
  const clusters: ActivityCluster[] = [];

  for (const event of events) {
    const clusterKey = `${event.actor_id ?? "unknown"}:${event.action}`;
    const last = clusters[clusters.length - 1];

    if (last && last.key === clusterKey) {
      last.events.push(event);
    } else {
      clusters.push({
        key: `${clusterKey}:${event.id}`,
        actor: event.actor,
        action: event.action,
        events: [event],
      });
    }
  }

  return clusters;
}
