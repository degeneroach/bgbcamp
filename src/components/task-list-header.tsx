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
import { getListAccentColor } from "@/lib/list-colors";

export function TaskListHeader({
  taskListId,
  projectSlug,
  listName,
  count,
}: {
  taskListId: string;
  projectSlug: string;
  listName: string;
  count: number;
}) {
  const [isPending, startTransition] = useTransition();
  const accentColor = getListAccentColor(listName);

  return (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
        <EditableListTitle taskListId={taskListId} projectSlug={projectSlug} name={listName} />
      </div>
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
              <AlertDialogTitle>Delete &ldquo;{listName}&rdquo;?</AlertDialogTitle>
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
