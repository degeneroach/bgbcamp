"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TaskListHeader } from "@/components/task-list-header";
import { TaskCard } from "@/components/task-card";
import { AddTaskInput } from "@/components/add-task-input";
import { reorderTaskLists, reorderTasks } from "@/app/(app)/projects/[slug]/tasks/actions";
import { isTaskCompleted } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import type { Profile, Task } from "@/types/database";

export interface BoardTask extends Task {
  assignees: Profile[];
  commentCount: number;
}

export interface BoardList {
  id: string;
  name: string;
  tasks: BoardTask[];
}

export function TaskListsBoard({
  projectId,
  projectSlug,
  lists,
}: {
  projectId: string;
  projectSlug: string;
  lists: BoardList[];
}) {
  const [orderedLists, setOrderedLists] = useOptimistic(lists);
  const [, startTransition] = useTransition();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ id: string; listId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ listId: string; taskId: string | null } | null>(
    null
  );

  // Moves the dragged task before targetTaskId in targetListId (or to the
  // end of that list when targetTaskId is null), optimistically, then
  // persists the target list's order.
  function moveTask(targetListId: string, targetTaskId: string | null) {
    const dragged = draggedTask;
    setDraggedTask(null);
    setDropTarget(null);
    if (!dragged || dragged.id === targetTaskId) return;

    const current = orderedLists;
    const sourceList = current.find((l) => l.id === dragged.listId);
    const targetList = current.find((l) => l.id === targetListId);
    const task = sourceList?.tasks.find((t) => t.id === dragged.id);
    if (!sourceList || !targetList || !task) return;

    const sourceTasks = sourceList.tasks.filter((t) => t.id !== dragged.id);
    const targetTasks =
      dragged.listId === targetListId ? [...sourceTasks] : [...targetList.tasks];
    const rawIndex = targetTaskId ? targetTasks.findIndex((t) => t.id === targetTaskId) : -1;
    const insertIndex = rawIndex === -1 ? targetTasks.length : rawIndex;
    targetTasks.splice(insertIndex, 0, { ...task, task_list_id: targetListId });

    const next = current.map((l) => {
      if (l.id === targetListId) return { ...l, tasks: targetTasks };
      if (l.id === dragged.listId) return { ...l, tasks: sourceTasks };
      return l;
    });

    startTransition(async () => {
      setOrderedLists(next);
      await reorderTasks(
        projectSlug,
        targetListId,
        targetTasks.map((t) => t.id)
      );
    });
  }

  function handleDrop(targetId: string) {
    const current = orderedLists;
    const fromIndex = current.findIndex((l) => l.id === draggedId);
    const toIndex = current.findIndex((l) => l.id === targetId);
    setDraggedId(null);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    startTransition(async () => {
      setOrderedLists(next);
      await reorderTaskLists(
        projectSlug,
        next.map((l) => l.id)
      );
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-5 md:gap-6">
      {orderedLists.map((list) => (
        <Card
          key={list.id}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggedTask && dropTarget?.listId !== list.id) {
              setDropTarget({ listId: list.id, taskId: null });
            }
          }}
          onDrop={() => (draggedTask ? moveTask(list.id, null) : handleDrop(list.id))}
          className={cn(
            "flex w-full shrink-0 flex-col overflow-hidden rounded-2xl p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_2px_8px_rgba(15,23,42,0.05)] ring-black/[0.05] transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_4px_12px_rgba(15,23,42,0.07)] sm:w-[340px]",
            draggedTask &&
              dropTarget?.listId === list.id &&
              "ring-2 ring-primary/40"
          )}
        >
          <TaskListHeader
            taskListId={list.id}
            projectSlug={projectSlug}
            listName={list.name}
            count={list.tasks.length}
            dragHandleProps={{
              draggable: true,
              onDragStart: () => setDraggedId(list.id),
              onDragEnd: () => setDraggedId(null),
            }}
          />
          <div>
            {list.tasks.some((task) => !isTaskCompleted(task)) && (
              <div className="flex flex-col gap-1.5 p-2">
                {list.tasks
                  .filter((task) => !isTaskCompleted(task))
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projectSlug={projectSlug}
                      assignees={task.assignees}
                      commentCount={task.commentCount}
                      dragging={draggedTask?.id === task.id}
                      isDropTarget={dropTarget?.taskId === task.id}
                      dragHandlers={{
                        draggable: true,
                        onDragStart: (e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedTask({ id: task.id, listId: list.id });
                        },
                        onDragEnd: () => {
                          setDraggedTask(null);
                          setDropTarget(null);
                        },
                        onDragOver: (e) => {
                          if (!draggedTask) return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (dropTarget?.taskId !== task.id) {
                            setDropTarget({ listId: list.id, taskId: task.id });
                          }
                        },
                        onDrop: (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          moveTask(list.id, task.id);
                        },
                      }}
                    />
                  ))}
              </div>
            )}
            <CompletedTasksSection
              tasks={list.tasks.filter((task) => isTaskCompleted(task))}
              projectSlug={projectSlug}
            />
            <AddTaskInput projectId={projectId} projectSlug={projectSlug} taskListId={list.id} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Completed tasks collapse into a one-line summary so they don't crowd out
// the open work (Basecamp-style). Expanding shows minified rows.
function CompletedTasksSection({
  tasks,
  projectSlug,
}: {
  tasks: BoardTask[];
  projectSlug: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-accent/60"
      >
        <Check className="h-3.5 w-3.5 text-success" />
        <span>
          {tasks.length} completed
        </span>
        <ChevronDown
          className={cn("ml-auto h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
        />
      </button>
      {expanded &&
        tasks.map((task) => (
          <Link
            key={task.id}
            href={`/projects/${projectSlug}/tasks/${task.id}`}
            className="flex items-center gap-2 px-3 py-1.5 pl-8 hover:bg-accent/60"
          >
            <span className="truncate text-xs text-muted-foreground line-through">
              {task.title}
            </span>
          </Link>
        ))}
    </div>
  );
}
