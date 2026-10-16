"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RecurringComposer,
  type RecurringInitial,
} from "@/components/recurring-tasks-manager";
import type { Profile } from "@/types/database";

// "Make recurring" from inside a task: opens the recurring-task composer
// pre-filled with this task's title, list, assignees, and description.
export function MakeRecurringButton({
  projectId,
  projectSlug,
  lists,
  members,
  initial,
}: {
  projectId: string;
  projectSlug: string;
  lists: { id: string; name: string }[];
  members: Profile[];
  initial: RecurringInitial;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Make recurring — schedule this task to repeat"
        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Make recurring"
      >
        <Repeat className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              Make this task recurring
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Creates a schedule from this task — a fresh copy appears on each
            occurrence with the due date set. This existing task is left as-is.
          </p>
          <RecurringComposer
            projectId={projectId}
            projectSlug={projectSlug}
            lists={lists}
            members={members}
            initial={initial}
            onDone={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
