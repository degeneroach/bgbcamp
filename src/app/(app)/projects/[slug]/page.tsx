import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getOrganizationMembers } from "@/lib/projects";
import { TaskFilters } from "@/components/task-filters";
import { NewTaskListForm } from "@/components/new-task-list-form";
import { TaskListsBoard, type BoardList, type BoardTask } from "@/components/task-lists-board";
import { RecentActivityCard } from "@/components/recent-activity-card";
import { startOfDay, addDays } from "date-fns";
import type { ActivityEventWithRelations } from "@/components/activity-item";
import type { Profile, Task, TaskList } from "@/types/database";

export default async function ProjectTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ assignee?: string; state?: string; due?: string }>;
}) {
  const { slug } = await params;
  const filters = await searchParams;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const project = await getProjectBySlug(supabase, organization.id, slug);
  const members = await getOrganizationMembers(supabase, organization.id);

  const { data: taskLists } = await supabase
    .from("task_lists")
    .select("*")
    .eq("project_id", project.id)
    .is("archived_at", null)
    .order("position", { ascending: true });

  let query = supabase.from("tasks").select("*").eq("project_id", project.id);

  if (filters.state === "open") {
    query = query.is("completed_at", null);
  } else if (filters.state === "completed") {
    query = query.not("completed_at", "is", null);
  }

  if (filters.due === "overdue") {
    query = query
      .lt("due_date", startOfDay(new Date()).toISOString().slice(0, 10))
      .is("completed_at", null);
  } else if (filters.due === "week") {
    query = query
      .gte("due_date", startOfDay(new Date()).toISOString().slice(0, 10))
      .lte("due_date", addDays(startOfDay(new Date()), 7).toISOString().slice(0, 10));
  } else if (filters.due === "none") {
    query = query.is("due_date", null);
  }

  const { data: tasks } = await query.order("position", { ascending: true });
  let taskList = (tasks ?? []) as Task[];
  const taskIds = taskList.map((t) => t.id);

  const [{ data: comments }, { data: assigneeRows }, { data: events }] = await Promise.all([
    taskIds.length
      ? supabase.from("task_comments").select("task_id").in("task_id", taskIds)
      : Promise.resolve({ data: [] as { task_id: string }[] }),
    taskIds.length
      ? supabase.from("task_assignees").select("task_id, profiles(*)").in("task_id", taskIds)
      : Promise.resolve({ data: [] as { task_id: string; profiles: Profile | null }[] }),
    supabase
      .from("activity_events")
      .select("*, actor:profiles!actor_id(*)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const commentCounts = new Map<string, number>();
  for (const comment of comments ?? []) {
    commentCounts.set(comment.task_id, (commentCounts.get(comment.task_id) ?? 0) + 1);
  }

  const assigneesByTask = new Map<string, Profile[]>();
  for (const row of (assigneeRows ?? []) as unknown as { task_id: string; profiles: Profile | null }[]) {
    if (!row.profiles) continue;
    const list = assigneesByTask.get(row.task_id) ?? [];
    list.push(row.profiles);
    assigneesByTask.set(row.task_id, list);
  }

  if (filters.assignee === "unassigned") {
    taskList = taskList.filter((t) => (assigneesByTask.get(t.id) ?? []).length === 0);
  } else if (filters.assignee) {
    taskList = taskList.filter((t) =>
      (assigneesByTask.get(t.id) ?? []).some((a) => a.id === filters.assignee)
    );
  }

  const tasksByList = new Map<string, BoardTask[]>();
  for (const task of taskList) {
    const list = tasksByList.get(task.task_list_id) ?? [];
    list.push({
      ...task,
      assignees: assigneesByTask.get(task.id) ?? [],
      commentCount: commentCounts.get(task.id) ?? 0,
    });
    tasksByList.set(task.task_list_id, list);
  }

  const boardLists: BoardList[] = ((taskLists as TaskList[] | null) ?? []).map((list) => ({
    id: list.id,
    name: list.name,
    tasks: tasksByList.get(list.id) ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TaskFilters members={members} />
        <NewTaskListForm projectId={project.id} projectSlug={slug} />
      </div>

      {boardLists.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No task lists yet. Add one to start tracking work.
        </p>
      ) : (
        <TaskListsBoard projectId={project.id} projectSlug={slug} lists={boardLists} />
      )}

      <RecentActivityCard
        events={(events ?? []) as unknown as ActivityEventWithRelations[]}
        viewAllHref={`/projects/${slug}/activity`}
      />
    </div>
  );
}
