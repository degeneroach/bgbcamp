"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTaskList } from "@/app/(app)/projects/[slug]/tasks/actions";

export function NewTaskListForm({ projectId, projectSlug }: { projectId: string; projectSlug: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add list
      </Button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createTaskList(projectId, projectSlug, name);
      setName("");
      setOpen(false);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => !name && setOpen(false)}
        placeholder="List name"
        className="h-8 w-40"
      />
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </form>
  );
}
