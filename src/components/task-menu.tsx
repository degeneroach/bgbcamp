"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link2, MoreHorizontal, Trash2 } from "lucide-react";
import { deleteTask } from "@/app/(app)/projects/[slug]/tasks/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TaskMenu({
  taskId,
  projectId,
  projectSlug,
  taskTitle,
  redirectAfterDelete = false,
  triggerClassName,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  taskTitle: string;
  /** True on the task detail page, where the deleted task's URL dies. */
  redirectAfterDelete?: boolean;
  triggerClassName?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/projects/${projectSlug}/tasks/${taskId}`
      );
      toast.success("Link copied — paste it to a teammate.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTask(taskId, projectId, projectSlug, taskTitle);
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete the task.");
        return;
      }
      if (redirectAfterDelete) router.push(`/projects/${projectSlug}`);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground",
            triggerClassName
          )}
          aria-label="Task options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={copyShareLink}>
            <Link2 className="h-4 w-4" />
            Copy share link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{taskTitle}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the task along with its comments, images, and files.
              It can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
