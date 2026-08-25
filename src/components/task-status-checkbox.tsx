"use client";

import { useOptimistic, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTaskCompleted } from "@/app/(app)/projects/[slug]/tasks/actions";

export function TaskStatusCheckbox({
  taskId,
  projectId,
  projectSlug,
  taskTitle,
  initialCompleted,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  taskTitle: string;
  initialCompleted: boolean;
}) {
  const [, startTransition] = useTransition();
  const [completed, setCompleted] = useOptimistic(initialCompleted);

  return (
    <Checkbox
      checked={completed}
      onCheckedChange={(checked) => {
        const value = checked === true;
        startTransition(async () => {
          setCompleted(value);
          await toggleTaskCompleted(taskId, projectId, projectSlug, taskTitle, value);
        });
      }}
      onClick={(e) => e.stopPropagation()}
      aria-label={completed ? "Mark task incomplete" : "Mark task complete"}
      // cursor-pointer overrides the board tile's grab cursor — checking a
      // box is a click, not a drag.
      className="cursor-pointer data-checked:border-success data-checked:bg-success data-checked:text-success-foreground"
    />
  );
}
