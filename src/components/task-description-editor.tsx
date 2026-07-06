"use client";

import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { updateTask } from "@/app/(app)/projects/[slug]/tasks/actions";
import { Loader2 } from "lucide-react";

export function TaskDescriptionEditor({
  taskId,
  projectId,
  projectSlug,
  descriptionHtml,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  descriptionHtml: string;
}) {
  const [html, setHtml] = useState(descriptionHtml);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateTask(taskId, projectId, projectSlug, { descriptionHtml: html });
      setDirty(false);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <RichTextEditor
        content={html}
        onChange={(value) => {
          setHtml(value);
          setDirty(true);
        }}
        placeholder="Add a description..."
        minHeight="6rem"
      />
      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save description
          </Button>
        </div>
      )}
    </div>
  );
}
