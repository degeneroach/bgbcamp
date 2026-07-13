"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TaskListHeader } from "@/components/task-list-header";
import { TaskCard } from "@/components/task-card";
import { AddTaskInput } from "@/components/add-task-input";
import { reorderTaskLists } from "@/app/(app)/projects/[slug]/tasks/actions";
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
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(list.id)}
          className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_2px_8px_rgba(15,23,42,0.05)] ring-black/[0.05] transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_4px_12px_rgba(15,23,42,0.07)] sm:w-[340px]"
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
            {list.tasks
              .filter((task) => !isTaskCompleted(task))
              .map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectSlug={projectSlug}
                  assignees={task.assignees}
                  commentCount={task.commentCount}
                />
              ))}
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
  const router = useRouter();

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
          <div
            key={task.id}
            className="flex cursor-pointer items-center gap-2 px-3 py-1.5 pl-8 hover:bg-accent/60"
            onClick={() => router.push(`/projects/${projectSlug}/tasks/${task.id}`)}
          >
            <span className="truncate text-xs text-muted-foreground line-through">
              {task.title}
            </span>
          </div>
        ))}
    </div>
  );
}
