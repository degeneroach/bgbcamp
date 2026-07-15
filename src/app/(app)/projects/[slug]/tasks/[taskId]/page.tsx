import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getOrganizationMembers } from "@/lib/projects";
import { TaskTitleEditor } from "@/components/task-title-editor";
import { TaskDescriptionEditor } from "@/components/task-description-editor";
import { TaskAssigneesPicker } from "@/components/task-assignees-picker";
import { TaskDueDatePicker } from "@/components/task-due-date-picker";
import { TaskStatusCheckbox } from "@/components/task-status-checkbox";
import { TaskImages } from "@/components/task-images";
import { TaskFiles } from "@/components/task-files";
import { TaskCommentSection } from "@/components/task-comment-section";
import { UserAvatar } from "@/components/user-avatar";
import { type BoostWithAuthor } from "@/components/boost-bar";
import { Card } from "@/components/ui/card";
import { isTaskCompleted } from "@/lib/tasks";
import { taskActivitySummary } from "@/lib/activity-summary";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import type { ActivityEvent, Profile, Task, TaskComment, TaskImage, TaskFile } from "@/types/database";

type TaskActivityEvent = ActivityEvent & { actor: Profile | null };

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ slug: string; taskId: string }>;
}) {
  const { slug, taskId } = await params;
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  // Every query here keys off taskId (from the URL) or the org, so run them
  // all in one parallel wave; project ownership of the task is validated
  // after the fact.
  const [
    project,
    members,
    { data: task },
    { data: comments },
    { data: images },
    { data: files },
    { data: events },
    { data: assigneeRows },
    { data: boostRows },
  ] = await Promise.all([
      getProjectBySlug(supabase, organization.id, slug),
      getOrganizationMembers(supabase, organization.id),
      supabase.from("tasks").select("*").eq("id", taskId).maybeSingle(),
      supabase
        .from("task_comments")
        .select("*, author:profiles!author_id(*)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }),
      supabase
        .from("task_images")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false }),
      supabase
        .from("task_files")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_events")
        .select("*, actor:profiles!actor_id(*)")
        .eq("entity_id", taskId)
        .in("entity_type", ["task", "task_comment", "task_image"])
        .order("created_at", { ascending: false }),
      supabase.from("task_assignees").select("profiles(*)").eq("task_id", taskId),
      supabase
        .from("boosts")
        .select("*, author:profiles!author_id(*)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }),
    ]);

  if (!task || task.project_id !== project.id) notFound();

  const typedTask = task as Task;
  const assignees = (assigneeRows ?? []).map((row) => row.profiles as unknown as Profile);
  const commentBoosts = ((boostRows ?? []) as unknown as BoostWithAuthor[]).filter(
    (b) => b.entity_type === "task_comment"
  );
  const activityEvents = (events ?? []) as unknown as TaskActivityEvent[];

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <TaskTitleEditor
            taskId={taskId}
            projectId={project.id}
            projectSlug={slug}
            title={typedTask.title}
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <TaskStatusCheckbox
                taskId={taskId}
                projectId={project.id}
                projectSlug={slug}
                taskTitle={typedTask.title}
                initialCompleted={isTaskCompleted(typedTask)}
              />
              <span className="text-sm font-medium">
                {isTaskCompleted(typedTask) ? "Completed" : "Mark complete"}
              </span>
            </div>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Assignees
              </span>
              <TaskAssigneesPicker
                taskId={taskId}
                projectId={project.id}
                projectSlug={slug}
                taskTitle={typedTask.title}
                members={members}
                assignees={assignees}
              />
            </div>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Due
              </span>
              <TaskDueDatePicker
                taskId={taskId}
                projectId={project.id}
                projectSlug={slug}
                dueDate={typedTask.due_date}
              />
            </div>
          </div>

          <div className="mt-3">
            <TaskDescriptionEditor
              taskId={taskId}
              projectId={project.id}
              projectSlug={slug}
              descriptionHtml={typedTask.description_html}
              members={members}
            />
          </div>
        </Card>

        <Card className="p-4">
          <TaskImages
            taskId={taskId}
            projectId={project.id}
            projectSlug={slug}
            taskTitle={typedTask.title}
            images={(images ?? []) as TaskImage[]}
          />
        </Card>

        <Card className="p-4">
          <TaskFiles
            taskId={taskId}
            projectId={project.id}
            projectSlug={slug}
            taskTitle={typedTask.title}
            files={(files ?? []) as TaskFile[]}
          />
        </Card>

        <Card className="p-4">
          <TaskCommentSection
            taskId={taskId}
            projectId={project.id}
            projectSlug={slug}
            taskTitle={typedTask.title}
            comments={(comments ?? []) as unknown as (TaskComment & { author: Profile | null })[]}
            members={members}
            boosts={commentBoosts}
            currentUserId={userId}
          />
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <span className="text-sm font-medium">Activity</span>
          {activityEvents.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {activityEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2.5">
                  <UserAvatar
                    name={event.actor?.full_name}
                    email={event.actor?.email ?? ""}
                    avatarUrl={event.actor?.avatar_url}
                    className="mt-px h-5 w-5 text-[9px]"
                  />
                  <div className="min-w-0 flex-1 text-xs leading-relaxed">
                    <span className="font-medium">{displayName(event.actor)}</span>{" "}
                    <span className="text-muted-foreground">{taskActivitySummary(event)}</span>
                    <span className="whitespace-nowrap text-muted-foreground/60">
                      {" "}
                      · {timeAgo(event.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
