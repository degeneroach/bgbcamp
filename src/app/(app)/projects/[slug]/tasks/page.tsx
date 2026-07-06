import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getProjectMembers } from "@/lib/projects";
import { TaskFilters } from "@/components/task-filters";
import { NewTaskListForm } from "@/components/new-task-list-form";
import { AddTaskInput } from "@/components/add-task-input";
import { TaskListHeader } from "@/components/task-list-header";
import { TaskCard } from "@/components/task-card";
import { Card } from "@/components/ui/card";
import { startOfDay, addDays } from "date-fns";
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
  const members = await getProjectMembers(supabase, project.id);

  const { data: taskLists } = await supabase
    .from("task_lists")
    .select("*")
    .eq("project_id", project.id)
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

  const [{ data: comments }, { data: assigneeRows }] = await Promise.all([
    taskIds.length
      ? supabase.from("task_comments").select("task_id").in("task_id", taskIds)
      : Promise.resolve({ data: [] as { task_id: string }[] }),
    taskIds.length
      ? supabase.from("task_assignees").select("task_id, profiles(*)").in("task_id", taskIds)
      : Promise.resolve({ data: [] as { task_id: string; profiles: Profile | null }[] }),
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

  const tasksByList = new Map<string, Task[]>();
  for (const task of taskList) {
    const list = tasksByList.get(task.task_list_id) ?? [];
    list.push(task);
    tasksByList.set(task.task_list_id, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TaskFilters members={members.map((m) => m.profiles)} />
        <NewTaskListForm projectId={project.id} projectSlug={slug} />
      </div>

      {(taskLists ?? []).length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No task lists yet. Add one to start tracking work.
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-3 md:gap-4">
          {(taskLists as TaskList[]).map((list) => {
            const listTasks = tasksByList.get(list.id) ?? [];
            return (
              <Card
                key={list.id}
                className="flex w-full shrink-0 flex-col overflow-hidden p-0 sm:w-[320px]"
              >
                <TaskListHeader
                  taskListId={list.id}
                  projectSlug={slug}
                  listName={list.name}
                  count={listTasks.length}
                />
                <div>
                  {listTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projectSlug={slug}
                      assignees={assigneesByTask.get(task.id) ?? []}
                      commentCount={commentCounts.get(task.id) ?? 0}
                    />
                  ))}
                  <AddTaskInput projectId={project.id} projectSlug={slug} taskListId={list.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
