"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { TaskListHeader } from "@/components/task-list-header";
import { TaskCard } from "@/components/task-card";
import { AddTaskInput } from "@/components/add-task-input";
import { reorderTaskLists } from "@/app/(app)/projects/[slug]/tasks/actions";
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
            {list.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                projectSlug={projectSlug}
                assignees={task.assignees}
                commentCount={task.commentCount}
              />
            ))}
            <AddTaskInput projectId={projectId} projectSlug={projectSlug} taskListId={list.id} />
          </div>
        </Card>
      ))}
    </div>
  );
}
