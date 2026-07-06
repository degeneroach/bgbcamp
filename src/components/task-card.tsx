"use client";

import { useRouter } from "next/navigation";
import { TaskStatusCheckbox } from "@/components/task-status-checkbox";
import { CommentCountBadge } from "@/components/comment-count-badge";
import { UserAvatar } from "@/components/user-avatar";
import { isTaskCompleted } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import type { Profile, Task } from "@/types/database";

export function TaskCard({
  task,
  projectSlug,
  assignees,
  commentCount,
}: {
  task: Task;
  projectSlug: string;
  assignees: Profile[];
  commentCount: number;
}) {
  const router = useRouter();
  const completed = isTaskCompleted(task);

  return (
    <div
      className="flex cursor-pointer items-center gap-4 border-b px-3 py-2.5 last:border-b-0 hover:bg-accent/60"
      onClick={() => router.push(`/projects/${projectSlug}/tasks/${task.id}`)}
    >
      <TaskStatusCheckbox
        taskId={task.id}
        projectId={task.project_id}
        projectSlug={projectSlug}
        taskTitle={task.title}
        initialCompleted={completed}
      />
      <span
        className={cn(
          "flex-1 truncate text-sm font-medium",
          completed && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </span>
      <CommentCountBadge count={commentCount} />
      {assignees.length > 0 ? (
        <div className="flex -space-x-2">
          {assignees.slice(0, 3).map((assignee) => (
            <UserAvatar
              key={assignee.id}
              name={assignee.full_name}
              email={assignee.email}
              avatarUrl={assignee.avatar_url}
              className="h-6 w-6 border-2 border-background"
            />
          ))}
          {assignees.length > 3 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
              +{assignees.length - 3}
            </span>
          )}
        </div>
      ) : (
        <span className="h-6 w-6" />
      )}
    </div>
  );
}
