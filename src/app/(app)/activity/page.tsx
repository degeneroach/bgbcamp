import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { ActivityFilters } from "@/components/activity-filters";
import { ActivityTimeline } from "@/components/activity-timeline";
import { groupActivityByDay, type ActivityEventFull } from "@/lib/activity-grouping";
import { describeActivity, getActivityTypeBucket } from "@/lib/activity-display";
import { subDays, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { Profile, Project } from "@/types/database";

const FETCH_LIMIT = 300;

export default async function GlobalActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    person?: string;
    type?: string;
    q?: string;
    range?: string;
  }>;
}) {
  const filters = await searchParams;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  const [{ data: projects }, { data: members }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("organization_members")
      .select("profiles(*)")
      .eq("organization_id", organization.id),
  ]);

  const people = (members ?? []).map((m) => m.profiles as unknown as Profile);

  let query = supabase
    .from("activity_events")
    .select("*, actor:profiles!actor_id(*), project:projects!project_id(slug, name)")
    .eq("organization_id", organization.id);

  if (filters.project) {
    const project = (projects as Project[] | null)?.find((p) => p.slug === filters.project);
    if (project) query = query.eq("project_id", project.id);
  }

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
    // Even with no explicit range, cap the window so a busy org doesn't
    // pull an unbounded amount of history into one page load.
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
        event.project?.name,
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything happening across all of your projects.
        </p>
      </div>

      <ActivityFilters projects={(projects as Project[]) ?? []} people={people} />

      <ActivityTimeline days={days} />
    </div>
  );
}
