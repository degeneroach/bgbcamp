"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Loader2 } from "lucide-react";
import { createPost } from "@/app/(app)/projects/[slug]/actions";
import { POST_TAGS } from "@/lib/post-tags";
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
  const [tag, setTag] = useState<string | null>(null);
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
      const result = await createPost(projectId, projectSlug, title, body, tag);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setTitle("");
      setBody("");
      setTag(null);
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {POST_TAGS.map((postTag) => {
            const active = tag === postTag.value;
            return (
              <button
                key={postTag.value}
                type="button"
                onClick={() => setTag(active ? null : postTag.value)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                  active ? postTag.activeClass : "text-muted-foreground hover:bg-muted"
                )}
              >
                <postTag.icon className="h-3.5 w-3.5" />
                {postTag.label}
              </button>
            );
          })}
        </div>
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
