"use client";

import { useState, useTransition } from "react";
import { renameTaskList } from "@/app/(app)/projects/[slug]/tasks/actions";

export function EditableListTitle({
  taskListId,
  projectSlug,
  name,
}: {
  taskListId: string;
  projectSlug: string;
  name: string;
}) {
  const [value, setValue] = useState(name);
  const [, startTransition] = useTransition();

  function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setValue(name);
      return;
    }
    if (trimmed === name) return;
    startTransition(() => {
      renameTaskList(taskListId, projectSlug, trimmed);
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
        if (e.key === "Escape") {
          setValue(name);
          (e.target as HTMLInputElement).blur();
        }
      }}
      aria-label="List name"
      className="w-full rounded border border-transparent bg-transparent px-1 -mx-1 text-sm font-semibold outline-none hover:border-input focus:border-input focus:bg-background"
    />
  );
}
