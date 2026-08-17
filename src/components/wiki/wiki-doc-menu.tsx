"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
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
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, FolderInput, Trash2 } from "lucide-react";
import { updateWikiDoc, deleteWikiDoc } from "@/app/(app)/tools/wiki/actions";
import { toast } from "sonner";
import type { WikiSection } from "@/types/database";

export function WikiDocMenu({
  docId,
  docTitle,
  currentSectionId,
  sections,
}: {
  docId: string;
  docTitle: string;
  currentSectionId: string;
  sections: Pick<WikiSection, "id" | "name">[];
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function rename() {
    const next = window.prompt("Rename doc:", docTitle);
    if (next === null || !next.trim()) return;
    startTransition(async () => {
      const result = await updateWikiDoc(docId, { title: next });
      if (!result.ok) toast.error(result.error ?? "Could not rename.");
    });
  }

  function move(sectionId: string) {
    startTransition(async () => {
      const result = await updateWikiDoc(docId, { sectionId });
      if (!result.ok) toast.error(result.error ?? "Could not move.");
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteWikiDoc(docId);
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete.");
        return;
      }
      router.push("/tools/wiki");
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Doc actions" />}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={rename}>
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderInput className="h-3.5 w-3.5" />
              Move to section
            </DropdownMenuLabel>
            {sections
              .filter((s) => s.id !== currentSectionId)
              .map((section) => (
                <DropdownMenuItem key={section.id} onSelect={() => move(section.id)}>
                  {section.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{docTitle}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the doc and can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
