import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/projects";
import { TaskListsBoard, type BoardList, type BoardTask } from "@/components/task-lists-board";
import { RecentActivityCard } from "@/components/recent-activity-card";
import type { ActivityEventWithRelations } from "@/components/activity-item";
import type { Profile, Task, TaskList } from "@/types/database";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const project = await getProjectBySlug(supabase, organization.id, slug);

  const { data: taskLists } = await supabase
    .from("task_lists")
    .select("*")
    .eq("project_id", project.id)
    .is("archived_at", null)
    .order("position", { ascending: true });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", project.id)
    .order("position", { ascending: true });
  const taskList = (tasks ?? []) as Task[];
  const taskIds = taskList.map((t) => t.id);

  const [{ data: comments }, { data: assigneeRows }, { data: events }] = await Promise.all([
    taskIds.length
      ? supabase.from("task_comments").select("task_id").in("task_id", taskIds)
      : Promise.resolve({ data: [] as { task_id: string }[] }),
    taskIds.length
      ? supabase.from("task_assignees").select("task_id, profiles(*)").in("task_id", taskIds)
      : Promise.resolve({ data: [] as { task_id: string; profiles: Profile | null }[] }),
    // Fetch a deeper window than initially shown — "View more activity"
    // reveals the rest client-side without another roundtrip.
    supabase
      .from("activity_events")
      .select("*, actor:profiles!actor_id(*)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(60),
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
    <div className="flex flex-col gap-8">
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
        projectSlug={slug}
      />
    </div>
  );
}
