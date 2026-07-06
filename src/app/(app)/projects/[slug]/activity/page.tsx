import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getProjectMembers } from "@/lib/projects";
import { ActivityFilters } from "@/components/activity-filters";
import { ActivityTimeline } from "@/components/activity-timeline";
import { groupActivityByDay, type ActivityEventFull } from "@/lib/activity-grouping";
import { describeActivity, getActivityTypeBucket } from "@/lib/activity-display";
import { subDays, startOfDay, startOfMonth, startOfWeek } from "date-fns";

const FETCH_LIMIT = 300;

export default async function ProjectActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ person?: string; type?: string; q?: string; range?: string }>;
}) {
  const { slug } = await params;
  const filters = await searchParams;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const project = await getProjectBySlug(supabase, organization.id, slug);
  const members = await getProjectMembers(supabase, project.id);

  let query = supabase
    .from("activity_events")
    .select("*, actor:profiles!actor_id(*), project:projects!project_id(slug, name)")
    .eq("project_id", project.id);

  if (filters.person) {
    query = query.eq("actor_id", filters.person);
  }

  if (filters.range === "today") {
    query = query.gte("created_at", startOfDay(new Date()).toISOString());
  } else if (filters.range === "week") {
    query = query.gte("created_at", startOfWeek(new Date()).toISOString());
  } else if (filters.range === "month") {
    query = query.gte("created_at", startOfMonth(new Date()).toISOString());
  } else {
    query = query.gte("created_at", subDays(new Date(), 90).toISOString());
  }

  const { data: events } = await query.order("created_at", { ascending: false }).limit(FETCH_LIMIT);

  let filteredEvents = (events ?? []) as unknown as ActivityEventFull[];

  if (filters.type && filters.type !== "all") {
    filteredEvents = filteredEvents.filter(
      (event) => getActivityTypeBucket(event.action) === filters.type
    );
  }

  if (filters.q && filters.q.trim().length > 0) {
    const q = filters.q.trim().toLowerCase();
    filteredEvents = filteredEvents.filter((event) => {
      const display = describeActivity(event, event.project?.slug ?? null);
      const haystack = [
        event.actor?.full_name,
        event.actor?.email,
        display.itemLabel,
        (event.metadata as Record<string, string | undefined>)?.bodyPreview,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  const days = groupActivityByDay(filteredEvents);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <ActivityFilters people={members.map((m) => m.profiles)} />
      <ActivityTimeline days={days} />
    </div>
  );
}
