import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationMembers } from "@/lib/projects";
import { DueDateCalendar, type CalendarTask } from "@/components/due-date-calendar";
import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import type { CalendarEvent, Profile, Project, Task } from "@/types/database";

export const metadata = {
  title: "Calendar · BGBCamp",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  // Month being viewed (?m=YYYY-MM), padded to full display weeks so tasks
  // on the leading/trailing days of adjacent months still show.
  const monthStart = /^\d{4}-\d{2}$/.test(m ?? "")
    ? new Date(`${m}-01T00:00:00`)
    : startOfMonth(new Date());
  const rangeStart = startOfWeek(startOfMonth(monthStart));
  const rangeEnd = addDays(endOfWeek(endOfMonth(monthStart)), 1);
  const fromDate = rangeStart.toISOString().slice(0, 10);
  const toDate = rangeEnd.toISOString().slice(0, 10);

  const [{ data: projects }, members, { data: events }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("archived", false)
      .order("name", { ascending: true }),
    getOrganizationMembers(supabase, organization.id),
    supabase
      .from("calendar_events")
      .select("*")
      .eq("organization_id", organization.id)
      .gte("event_date", fromDate)
      .lt("event_date", toDate)
      .order("start_time", { ascending: true, nullsFirst: true }),
  ]);

  // Tasks carry no organization_id — scope through the org's projects.
  const projectIds = ((projects ?? []) as Project[]).map((p) => p.id);
  const { data: tasks } = projectIds.length
    ? await supabase
        .from("tasks")
        .select("*")
        .in("project_id", projectIds)
        .not("due_date", "is", null)
        .gte("due_date", fromDate)
        .lt("due_date", toDate)
    : { data: [] as Task[] };

  const taskRows = (tasks ?? []) as Task[];
  const taskIds = taskRows.map((t) => t.id);
  const { data: assigneeRows } = taskIds.length
    ? await supabase
        .from("task_assignees")
        .select("task_id, profiles(*)")
        .in("task_id", taskIds)
    : { data: [] as { task_id: string; profiles: Profile | null }[] };

  const assigneesByTask = new Map<string, Profile[]>();
  for (const row of (assigneeRows ?? []) as unknown as {
    task_id: string;
    profiles: Profile | null;
  }[]) {
    if (!row.profiles) continue;
    const list = assigneesByTask.get(row.task_id) ?? [];
    list.push(row.profiles);
    assigneesByTask.set(row.task_id, list);
  }

  const calendarTasks: CalendarTask[] = taskRows.map((task) => ({
    ...task,
    assignees: assigneesByTask.get(task.id) ?? [],
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Task due dates across every project, plus company events.
        </p>
      </div>

      <DueDateCalendar
        monthISO={monthStart.toISOString().slice(0, 10)}
        tasks={calendarTasks}
        events={(events ?? []) as CalendarEvent[]}
        projects={(projects ?? []) as Project[]}
        members={members}
        currentUserId={userId}
      />
    </div>
  );
}
