"use client";

import { useState, useTransition } from "react";
import { updateTask } from "@/app/(app)/projects/[slug]/tasks/actions";

export function TaskTitleEditor({
  taskId,
  projectId,
  projectSlug,
  title,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  title: string;
}) {
  const [value, setValue] = useState(title);
  const [, startTransition] = useTransition();

  function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      setValue(title);
      return;
    }
    startTransition(() => {
      updateTask(taskId, projectId, projectSlug, { title: trimmed });
    });
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-full rounded-md border border-transparent bg-transparent px-1 -mx-1 text-xl font-normal outline-none hover:border-input focus:border-input focus:bg-background"
    />
  );
}
