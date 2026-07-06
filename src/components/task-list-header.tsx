"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableListTitle } from "@/components/editable-list-title";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteTaskList } from "@/app/(app)/projects/[slug]/tasks/actions";

export function TaskListHeader({
  taskListId,
  projectSlug,
  name,
  count,
}: {
  taskListId: string;
  projectSlug: string;
  name: string;
  count: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
      <EditableListTitle taskListId={taskListId} projectSlug={projectSlug} name={name} />
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{count}</span>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
              />
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Delete list</span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &ldquo;{name}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                {count > 0
                  ? `This will permanently delete this list and all ${count} task${count === 1 ? "" : "s"} in it, including their comments and images.`
                  : "This list is empty and will be permanently deleted."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    deleteTaskList(taskListId, projectSlug);
                  });
                }}
              >
                Delete list
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
