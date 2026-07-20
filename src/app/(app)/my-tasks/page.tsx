import Link from "next/link";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { MyTasksFilters } from "@/components/my-tasks-filters";
import { TaskStatusCheckbox } from "@/components/task-status-checkbox";
import { DueDateBadge } from "@/components/due-date-badge";
import { CommentCountBadge } from "@/components/comment-count-badge";
import { Card } from "@/components/ui/card";
import { isTaskCompleted } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { startOfDay, addDays } from "date-fns";
import type { Task } from "@/types/database";

type AssignedTask = Task & {
  assignedAt: string;
  commentCount: number;
  projects: { id: string; name: string; slug: string; color: string; logo_url: string | null };
};

function TaskRow({ task }: { task: AssignedTask }) {
  const completed = isTaskCompleted(task);
  return (
    <div className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0 hover:bg-muted/40">
      <TaskStatusCheckbox
        taskId={task.id}
        projectId={task.project_id}
        projectSlug={task.projects.slug}
        taskTitle={task.title}
        initialCompleted={completed}
      />
      <Link
        href={`/projects/${task.projects.slug}/tasks/${task.id}`}
        className="min-w-0 flex-1"
      >
        <span
          className={cn(
            "block truncate text-sm font-medium hover:underline",
            completed && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </span>
      </Link>
      <Link
        href={`/projects/${task.projects.slug}`}
        className="hidden shrink-0 items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted sm:flex"
      >
        {task.projects.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={task.projects.logo_url}
            alt=""
            className="h-3.5 w-3.5 rounded-[4px] object-cover"
          />
        ) : (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: task.projects.color }}
          />
        )}
        {task.projects.name}
      </Link>
      <DueDateBadge dueDate={task.due_date} completed={completed} />
      <CommentCountBadge count={task.commentCount} />
    </div>
  );
}

function TaskGroup({
  title,
  tone,
  tasks,
}: {
  title: string;
  tone: "danger" | "warning" | "info" | "muted";
  tasks: AssignedTask[];
}) {
  if (tasks.length === 0) return null;
  const toneClass = {
    danger: "text-rose-500",
    warning: "text-amber-500",
    info: "text-sky-500",
    muted: "text-muted-foreground",
  }[tone];

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b bg-muted/30 px-4 py-2">
        <h2 className={cn("text-sm font-semibold", toneClass)}>
          {title} <span className="font-normal text-muted-foreground">({tasks.length})</span>
        </h2>
      </div>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </Card>
  );
}

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; sort?: string }>;
}) {
  const filters = await searchParams;
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("task_assignees")
    .select(
      "created_at, tasks!inner(*, projects!inner(id, name, slug, color, logo_url, organization_id, archived))"
    )
    .eq("user_id", userId)
    .eq("tasks.projects.organization_id", organization.id)
    .eq("tasks.projects.archived", false);

  let tasks: AssignedTask[] = (assignments ?? []).map((row) => {
    const task = row.tasks as unknown as AssignedTask;
    return { ...task, assignedAt: row.created_at, commentCount: 0 };
  });

  // Project filter dropdown options come from what's actually assigned.
  const projectOptions = Array.from(
    new Map(tasks.map((t) => [t.projects.slug, { slug: t.projects.slug, name: t.projects.name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  if (filters.project) {
    tasks = tasks.filter((t) => t.projects.slug === filters.project);
  }

  const taskIds = tasks.map((t) => t.id);
  if (taskIds.length > 0) {
    const { data: comments } = await supabase
      .from("task_comments")
      .select("task_id")
      .in("task_id", taskIds);
    const counts = new Map<string, number>();
    for (const c of comments ?? []) counts.set(c.task_id, (counts.get(c.task_id) ?? 0) + 1);
    for (const t of tasks) t.commentCount = counts.get(t.id) ?? 0;
  }

  const open = tasks.filter((t) => !isTaskCompleted(t));
  const completed = tasks
    .filter((t) => isTaskCompleted(t))
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .slice(0, 15);

  const sortByAssigned = filters.sort === "assigned";
  const today = startOfDay(new Date()).toISOString().slice(0, 10);
  const weekOut = addDays(startOfDay(new Date()), 7).toISOString().slice(0, 10);

  const byDue = (a: AssignedTask, b: AssignedTask) =>
    (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  const byAssigned = (a: AssignedTask, b: AssignedTask) =>
    b.assignedAt.localeCompare(a.assignedAt);

  const overdue = open.filter((t) => t.due_date && t.due_date < today).sort(byDue);
  const dueToday = open.filter((t) => t.due_date === today);
  const dueThisWeek = open
    .filter((t) => t.due_date && t.due_date > today && t.due_date <= weekOut)
    .sort(byDue);
  const later = open.filter((t) => t.due_date && t.due_date > weekOut).sort(byDue);
  const noDate = open.filter((t) => !t.due_date).sort(byAssigned);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything on your plate, across all projects.
            {open.length > 0 && (
              <span className="font-medium text-foreground"> {open.length} open.</span>
            )}
          </p>
        </div>
        <MyTasksFilters projects={projectOptions} />
      </div>

      {open.length === 0 && completed.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-24 text-center">
          <p className="font-medium">Nothing on your plate 🎉</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            When someone assigns you a task, it&apos;ll show up here.
          </p>
        </div>
      ) : sortByAssigned ? (
        <TaskGroup title="Open — recently assigned first" tone="info" tasks={[...open].sort(byAssigned)} />
      ) : (
        <>
          <TaskGroup title="Overdue" tone="danger" tasks={overdue} />
          <TaskGroup title="Due today" tone="warning" tasks={dueToday} />
          <TaskGroup title="Due this week" tone="info" tasks={dueThisWeek} />
          <TaskGroup title="Later" tone="muted" tasks={later} />
          <TaskGroup title="No due date" tone="muted" tasks={noDate} />
        </>
      )}

      {completed.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-muted/40">
            ✓ Recently completed ({completed.length}) — click to{" "}
            <span className="group-open:hidden">show</span>
            <span className="hidden group-open:inline">hide</span>
          </summary>
          <Card className="mt-2 overflow-hidden p-0">
            {completed.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </Card>
        </details>
      )}
    </div>
  );
}
