"use client";

import { useState, useTransition } from "react";
import { RichTextEditor, RichTextContent } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { updateTask } from "@/app/(app)/projects/[slug]/tasks/actions";
import { displayName } from "@/lib/display-name";
import { Loader2, Pencil } from "lucide-react";
import type { Profile } from "@/types/database";

function isBlankHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}

export function TaskDescriptionEditor({
  taskId,
  projectId,
  projectSlug,
  descriptionHtml,
  members,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  descriptionHtml: string;
  members: Profile[];
}) {
  const mentionCandidates = members.map((m) => ({ id: m.id, label: displayName(m) }));
  // The committed (saved) description shown in read-only mode.
  const [savedHtml, setSavedHtml] = useState(descriptionHtml);
  // Draft being edited. Start in edit mode only when there's nothing yet.
  const [draftHtml, setDraftHtml] = useState(descriptionHtml);
  const [editing, setEditing] = useState(() => isBlankHtml(descriptionHtml));
  const [isPending, startTransition] = useTransition();

  function handleUpdate() {
    startTransition(async () => {
      await updateTask(taskId, projectId, projectSlug, { descriptionHtml: draftHtml });
      setSavedHtml(draftHtml);
      setEditing(false);
    });
  }

  function startEditing() {
    setDraftHtml(savedHtml);
    setEditing(true);
  }

  if (!editing) {
    return (
      <div className="group/description flex flex-col gap-2">
        {isBlankHtml(savedHtml) ? (
          <button
            type="button"
            onClick={startEditing}
            className="w-fit text-sm text-muted-foreground hover:text-foreground"
          >
            Add a description...
          </button>
        ) : (
          <RichTextContent html={savedHtml} className="text-sm" />
        )}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={startEditing}
            className="text-muted-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <RichTextEditor
        content={draftHtml}
        onChange={setDraftHtml}
        placeholder="Add a description... (@ to mention, paste or drop images)"
        minHeight="6rem"
        projectId={projectId}
        enableImages
        mentionCandidates={mentionCandidates}
      />
      <div className="flex justify-end gap-2">
        {!isBlankHtml(savedHtml) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraftHtml(savedHtml);
              setEditing(false);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
        <Button variant="cta" size="sm" onClick={handleUpdate} disabled={isPending}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Update
        </Button>
      </div>
    </div>
  );
}
