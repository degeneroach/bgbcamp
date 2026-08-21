"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { TaskStatusCheckbox } from "@/components/task-status-checkbox";
import { TaskMenu } from "@/components/task-menu";
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
  dragging = false,
  isDropTarget = false,
  dragHandlers,
}: {
  task: Task;
  projectSlug: string;
  assignees: Profile[];
  commentCount: number;
  /** True while this card is the one being dragged. */
  dragging?: boolean;
  /** True while another task is hovering over this card. */
  isDropTarget?: boolean;
  dragHandlers?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
}) {
  const completed = isTaskCompleted(task);

  return (
    <div
      {...dragHandlers}
      className={cn(
        // One step lighter than the list card so tasks read as distinct,
        // grabbable tiles.
        "group/task flex cursor-grab items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2.5 transition-colors hover:bg-accent/60 active:cursor-grabbing dark:bg-white/[0.05] dark:hover:bg-accent/60",
        dragging && "opacity-40",
        isDropTarget && "ring-2 ring-primary/60"
      )}
    >
      <TaskStatusCheckbox
        taskId={task.id}
        projectId={task.project_id}
        projectSlug={projectSlug}
        taskTitle={task.title}
        initialCompleted={completed}
      />
      {/* A real link so right-click / Ctrl+click "open in new tab" works.
          draggable=false so dragging the row moves the task, not the URL. */}
      <Link
        href={`/projects/${projectSlug}/tasks/${task.id}`}
        draggable={false}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <span
          className={cn(
            "flex-1 truncate text-sm font-medium",
            completed && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </span>
        {task.due_date && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 text-xs tabular-nums",
              !completed && parseISO(task.due_date) < startOfDay(new Date())
                ? "font-medium text-destructive"
                : "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {format(parseISO(task.due_date), "MMM d")}
          </span>
        )}
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
      </Link>
      <TaskMenu
        taskId={task.id}
        projectId={task.project_id}
        projectSlug={projectSlug}
        taskTitle={task.title}
        triggerClassName="shrink-0 opacity-0 transition-opacity group-hover/task:opacity-100 aria-expanded:opacity-100"
      />
    </div>
  );
}
