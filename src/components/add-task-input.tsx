"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createTask } from "@/app/(app)/projects/[slug]/tasks/actions";

export function AddTaskInput({
  projectId,
  projectSlug,
  taskListId,
}: {
  projectId: string;
  projectSlug: string;
  taskListId: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      await createTask(projectId, projectSlug, taskListId, title);
      setTitle("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title && setOpen(false)}
        placeholder="Task title"
        className="h-8"
        disabled={isPending}
      />
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </form>
  );
}
