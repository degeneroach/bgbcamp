import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { ActivityItem, type ActivityEventWithRelations } from "@/components/activity-item";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { isTaskCompleted } from "@/lib/tasks";
import type { Profile, Task, TaskComment, TaskImage, TaskFile } from "@/types/database";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ slug: string; taskId: string }>;
}) {
  const { slug, taskId } = await params;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const project = await getProjectBySlug(supabase, organization.id, slug);
  const members = await getOrganizationMembers(supabase, organization.id);

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!task) notFound();

  const [
    { data: comments },
    { data: images },
    { data: files },
    { data: events },
    { data: assigneeRows },
  ] = await Promise.all([
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
    ]);

  const typedTask = task as Task;
  const assignees = (assigneeRows ?? []).map((row) => row.profiles as unknown as Profile);

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <Link
        href={`/projects/${slug}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to tasks
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <TaskTitleEditor
              taskId={taskId}
              projectId={project.id}
              projectSlug={slug}
              title={typedTask.title}
            />
            <div className="mt-3">
              <TaskDescriptionEditor
                taskId={taskId}
                projectId={project.id}
                projectSlug={slug}
                descriptionHtml={typedTask.description_html}
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
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <TaskStatusCheckbox
                taskId={taskId}
                projectId={project.id}
                projectSlug={slug}
                taskTitle={typedTask.title}
                initialCompleted={isTaskCompleted(typedTask)}
              />
              <span className="text-sm">
                {isTaskCompleted(typedTask) ? "Completed" : "Mark as complete"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Assignees</Label>
              <TaskAssigneesPicker
                taskId={taskId}
                projectId={project.id}
                projectSlug={slug}
                taskTitle={typedTask.title}
                members={members}
                assignees={assignees}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Due date</Label>
              <TaskDueDatePicker
                taskId={taskId}
                projectId={project.id}
                projectSlug={slug}
                dueDate={typedTask.due_date}
              />
            </div>
          </Card>

          <Card className="flex flex-col p-4">
            <span className="mb-2 text-sm font-medium">Activity</span>
            <div className="flex flex-col divide-y">
              {(events ?? []).length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                (events as unknown as ActivityEventWithRelations[]).map((event) => (
                  <ActivityItem key={event.id} event={event} />
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
