"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Check, Pencil, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TaskListHeader } from "@/components/task-list-header";
import { TaskCard } from "@/components/task-card";
import { AddTaskInput } from "@/components/add-task-input";
import {
  createTaskGroup,
  deleteTaskGroup,
  renameTaskGroup,
  reorderTaskLists,
  reorderTasks,
} from "@/app/(app)/projects/[slug]/tasks/actions";
import { isTaskCompleted } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import type { Profile, Task, TaskGroup } from "@/types/database";

export interface BoardTask extends Task {
  assignees: Profile[];
  commentCount: number;
}

export interface BoardList {
  id: string;
  name: string;
  tasks: BoardTask[];
  groups: TaskGroup[];
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
  const [dropTarget, setDropTarget] = useState<{
    listId: string;
    taskId: string | null;
    groupId: string | null;
  } | null>(null);

  // Moves the dragged task, optimistically, then persists the target list's
  // order (and each task's group). Dropping on a task inserts before it and
  // inherits its group; dropping on a group header appends to that group;
  // dropping on the list body appends ungrouped.
  function moveTask(
    targetListId: string,
    targetTaskId: string | null,
    targetGroupId?: string | null
  ) {
    const dragged = draggedTask;
    setDraggedTask(null);
    setDropTarget(null);
    if (!dragged) return;

    const current = orderedLists;
    const sourceList = current.find((l) => l.id === dragged.listId);
    const targetList = current.find((l) => l.id === targetListId);
    const task = sourceList?.tasks.find((t) => t.id === dragged.id);
    if (!sourceList || !targetList || !task) return;

    const targetTask = targetTaskId
      ? targetList.tasks.find((t) => t.id === targetTaskId)
      : null;
    const groupId =
      targetGroupId !== undefined ? targetGroupId : targetTask ? targetTask.group_id : null;
    if (dragged.id === targetTaskId && task.group_id === groupId) return;

    const sourceTasks = sourceList.tasks.filter((t) => t.id !== dragged.id);
    const targetTasks =
      dragged.listId === targetListId ? [...sourceTasks] : [...targetList.tasks];
    const moved = { ...task, task_list_id: targetListId, group_id: groupId };

    if (targetTaskId && targetTaskId !== dragged.id) {
      const rawIndex = targetTasks.findIndex((t) => t.id === targetTaskId);
      targetTasks.splice(rawIndex === -1 ? targetTasks.length : rawIndex, 0, moved);
    } else if (groupId) {
      // Append after the group's last task so it lands at the group's end.
      let lastIndex = -1;
      targetTasks.forEach((t, i) => {
        if (t.group_id === groupId) lastIndex = i;
      });
      targetTasks.splice(lastIndex === -1 ? targetTasks.length : lastIndex + 1, 0, moved);
    } else {
      targetTasks.push(moved);
    }

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
        targetTasks.map((t) => ({ id: t.id, groupId: t.group_id }))
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

  function taskDragHandlers(task: BoardTask, listId: string) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        setDraggedTask({ id: task.id, listId });
      },
      onDragEnd: () => {
        setDraggedTask(null);
        setDropTarget(null);
      },
      onDragOver: (e: React.DragEvent) => {
        if (!draggedTask) return;
        e.preventDefault();
        e.stopPropagation();
        if (dropTarget?.taskId !== task.id) {
          setDropTarget({ listId, taskId: task.id, groupId: task.group_id });
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        moveTask(listId, task.id);
      },
    };
  }

  function renderTask(task: BoardTask, listId: string) {
    return (
      <TaskCard
        key={task.id}
        task={task}
        projectSlug={projectSlug}
        assignees={task.assignees}
        commentCount={task.commentCount}
        dragging={draggedTask?.id === task.id}
        isDropTarget={dropTarget?.taskId === task.id}
        dragHandlers={taskDragHandlers(task, listId)}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-5 md:gap-6">
      {orderedLists.map((list) => {
        const openTasks = list.tasks.filter((task) => !isTaskCompleted(task));
        const groupIds = new Set(list.groups.map((g) => g.id));
        const ungrouped = openTasks.filter(
          (task) => !task.group_id || !groupIds.has(task.group_id)
        );
        return (
          <Card
            key={list.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (
                draggedTask &&
                (dropTarget?.listId !== list.id ||
                  dropTarget?.taskId !== null ||
                  dropTarget?.groupId !== null)
              ) {
                setDropTarget({ listId: list.id, taskId: null, groupId: null });
              }
            }}
            onDrop={() => (draggedTask ? moveTask(list.id, null, null) : handleDrop(list.id))}
            className={cn(
              "flex w-full shrink-0 flex-col overflow-hidden rounded-2xl p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_2px_8px_rgba(15,23,42,0.05)] ring-black/[0.05] transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_4px_12px_rgba(15,23,42,0.07)] sm:w-[340px]",
              draggedTask && dropTarget?.listId === list.id && "ring-2 ring-primary/40"
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
              {(ungrouped.length > 0 || list.groups.length > 0) && (
                <div className="flex flex-col gap-1.5 p-2">
                  {ungrouped.map((task) => renderTask(task, list.id))}
                  {list.groups.map((group) => {
                    const groupTasks = openTasks.filter((t) => t.group_id === group.id);
                    const isGroupTarget =
                      draggedTask !== null &&
                      dropTarget?.listId === list.id &&
                      dropTarget?.groupId === group.id &&
                      dropTarget?.taskId === null;
                    return (
                      <div
                        key={group.id}
                        onDragOver={(e) => {
                          if (!draggedTask) return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (
                            dropTarget?.groupId !== group.id ||
                            dropTarget?.taskId !== null
                          ) {
                            setDropTarget({ listId: list.id, taskId: null, groupId: group.id });
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          moveTask(list.id, null, group.id);
                        }}
                        className={cn(
                          "flex flex-col gap-1.5 rounded-lg transition-shadow",
                          isGroupTarget && "ring-2 ring-primary/40"
                        )}
                      >
                        <GroupHeader group={group} projectSlug={projectSlug} />
                        {groupTasks.length > 0 ? (
                          groupTasks.map((task) => renderTask(task, list.id))
                        ) : (
                          <p className="rounded-md border border-dashed px-2 py-1.5 text-center text-[11px] text-muted-foreground/60">
                            Drag tasks here
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <CompletedTasksSection
                tasks={list.tasks.filter((task) => isTaskCompleted(task))}
                projectSlug={projectSlug}
              />
              <AddTaskInput projectId={projectId} projectSlug={projectSlug} taskListId={list.id} />
              <AddGroupButton taskListId={list.id} projectSlug={projectSlug} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// Small labeled section header inside a list, e.g. "Website Edits" within a
// Black Friday list. Rename/delete controls appear on hover.
function GroupHeader({ group, projectSlug }: { group: TaskGroup; projectSlug: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="group/hdr mt-1 flex items-center gap-1.5 px-1 first:mt-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {group.name}
      </span>
      <span className="h-px flex-1 bg-border" />
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const name = window.prompt("Group name", group.name)?.trim();
          if (!name || name === group.name) return;
          startTransition(() => {
            renameTaskGroup(group.id, projectSlug, name);
          });
        }}
        className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover/hdr:opacity-100 disabled:opacity-50"
        aria-label={`Rename group ${group.name}`}
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (
            !window.confirm(
              `Delete the "${group.name}" group? Its tasks stay in the list, just ungrouped.`
            )
          )
            return;
          startTransition(() => {
            deleteTaskGroup(group.id, projectSlug);
          });
        }}
        className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-destructive group-hover/hdr:opacity-100 disabled:opacity-50"
        aria-label={`Delete group ${group.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// Inline "+ Add group" affordance at the bottom of each list.
function AddGroupButton({ taskListId, projectSlug }: { taskListId: string; projectSlug: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setOpen(false);
      return;
    }
    setName("");
    setOpen(false);
    startTransition(() => {
      createTaskGroup(taskListId, projectSlug, trimmed);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-xs text-muted-foreground/70 hover:bg-accent/60 hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Add group
      </button>
    );
  }

  return (
    <div className="border-t px-3 py-2">
      <input
        ref={inputRef}
        autoFocus
        value={name}
        disabled={isPending}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setName("");
            setOpen(false);
          }
        }}
        onBlur={submit}
        placeholder="Group name, e.g. Website Edits"
        className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
      />
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
