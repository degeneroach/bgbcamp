"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreTaskList } from "@/app/(app)/projects/[slug]/tasks/actions";
import type { TaskList } from "@/types/database";

export function ArchivedListsSection({
  projectSlug,
  lists,
}: {
  projectSlug: string;
  lists: TaskList[];
}) {
  const [isPending, startTransition] = useTransition();

  if (lists.length === 0) {
    return <p className="text-sm text-muted-foreground">No archived lists.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {lists.map((list) => (
        <div
          key={list.id}
          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
        >
          <span className="truncate text-sm">{list.name}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                restoreTaskList(list.id, projectSlug);
              });
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore
          </Button>
        </div>
      ))}
    </div>
  );
}
