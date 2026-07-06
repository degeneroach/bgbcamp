import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { PersonActivityView, type TaskWithProject } from "@/components/person-activity-view";
import type { ActivityEventWithRelations } from "@/components/activity-item";
import { isTaskCompleted } from "@/lib/tasks";
import { startOfDay } from "date-fns";
import type { Profile, Role } from "@/types/database";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, profiles(*)")
    .eq("organization_id", organization.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership || !membership.profiles) {
    notFound();
  }

  const { data: assignments } = await supabase
    .from("task_assignees")
    .select("tasks!inner(*, projects!inner(organization_id, name, slug))")
    .eq("user_id", userId)
    .eq("tasks.projects.organization_id", organization.id);

  const allTasks = (assignments ?? [])
    .map((a) => a.tasks)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")) as unknown as TaskWithProject[];
  const taskIds = allTasks.map((t) => t.id);

  const [{ data: comments }, { data: events }] = await Promise.all([
    taskIds.length
      ? supabase.from("task_comments").select("task_id").in("task_id", taskIds)
      : Promise.resolve({ data: [] as { task_id: string }[] }),
    supabase
      .from("activity_events")
      .select("*, actor:profiles!actor_id(*), project:projects!project_id(name, slug)")
      .eq("organization_id", organization.id)
      .eq("actor_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const commentCounts = new Map<string, number>();
  for (const comment of comments ?? []) {
    commentCounts.set(comment.task_id, (commentCounts.get(comment.task_id) ?? 0) + 1);
  }
  for (const task of allTasks) {
    task.commentCount = commentCounts.get(task.id) ?? 0;
  }

  const today = startOfDay(new Date()).toISOString().slice(0, 10);

  const overdueTasks = allTasks.filter(
    (t) => !isTaskCompleted(t) && t.due_date && t.due_date < today
  );
  const openTasks = allTasks.filter(
    (t) => !isTaskCompleted(t) && !(t.due_date && t.due_date < today)
  );
  const completedTasks = allTasks.filter((t) => isTaskCompleted(t));

  return (
    <PersonActivityView
      profile={membership.profiles as unknown as Profile}
      role={membership.role as Role}
      overdueTasks={overdueTasks}
      openTasks={openTasks}
      completedTasks={completedTasks}
      activityEvents={(events ?? []) as unknown as ActivityEventWithRelations[]}
    />
  );
}
