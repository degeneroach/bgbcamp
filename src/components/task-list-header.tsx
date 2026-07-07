"use client";

import { useTransition } from "react";
import { Archive, GripVertical } from "lucide-react";
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
import { archiveTaskList } from "@/app/(app)/projects/[slug]/tasks/actions";
import { getListAccentColor } from "@/lib/list-colors";

export function TaskListHeader({
  taskListId,
  projectSlug,
  listName,
  count,
  dragHandleProps,
}: {
  taskListId: string;
  projectSlug: string;
  listName: string;
  count: number;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}) {
  const [isPending, startTransition] = useTransition();
  const accentColor = getListAccentColor(listName);

  return (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
            aria-label={`Drag to reorder ${listName}`}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        )}
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
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              />
            }
          >
            <Archive className="h-3.5 w-3.5" />
            <span className="sr-only">Archive list</span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive &ldquo;{listName}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                {count > 0
                  ? `This will hide the list and its ${count} task${count === 1 ? "" : "s"} from the board. You can restore it anytime from Settings.`
                  : "This will hide the empty list from the board. You can restore it anytime from Settings."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    archiveTaskList(taskListId, projectSlug);
                  });
                }}
              >
                Archive list
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
