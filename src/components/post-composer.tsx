"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Loader2, Megaphone } from "lucide-react";
import { createPost } from "@/app/(app)/projects/[slug]/actions";
import { cn } from "@/lib/utils";

export function PostComposer({
  projectId,
  projectSlug,
}: {
  projectId: string;
  projectSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [announcement, setAnnouncement] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Card className="p-3">
        <button
          className="w-full rounded-md border border-dashed px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted/50"
          onClick={() => setOpen(true)}
        >
          Post an update to the team...
        </button>
      </Card>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createPost(
        projectId,
        projectSlug,
        title,
        body,
        announcement ? "announcement" : null
      );
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setTitle("");
      setBody("");
      setAnnouncement(false);
      setOpen(false);
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <Input
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <RichTextEditor
        content={body}
        onChange={setBody}
        placeholder="Share an update... (paste or drop images and videos)"
        projectId={projectId}
        enableImages
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setAnnouncement((v) => !v)}
          aria-pressed={announcement}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
            announcement
              ? "border-amber-400 bg-amber-400/15 font-medium text-amber-600 dark:text-amber-400"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Megaphone className="h-3.5 w-3.5" />
          Announcement
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="cta" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Post
          </Button>
        </div>
      </div>
    </Card>
  );
}
