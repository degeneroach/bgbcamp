"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/rich-text-editor";
import { htmlToExcerpt } from "@/lib/mentions";
import { Loader2, Send } from "lucide-react";
import type { MentionCandidate } from "@/lib/tiptap-mention-suggestion";

export function CommentForm({
  onSubmit,
  placeholder = "Write a comment... (@ to mention someone)",
  projectId,
  mentionCandidates,
}: {
  onSubmit: (bodyHtml: string) => Promise<{ ok: boolean; error?: string }>;
  placeholder?: string;
  projectId: string;
  mentionCandidates: MentionCandidate[];
}) {
  const [body, setBody] = useState("");
  const [key, setKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!htmlToExcerpt(body)) return;
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(body);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setBody("");
      setKey((k) => k + 1); // remounts the editor to fully clear its content
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <RichTextEditor
        key={key}
        content=""
        onChange={setBody}
        placeholder={placeholder}
        minHeight="3rem"
        projectId={projectId}
        enableImages
        mentionCandidates={mentionCandidates}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Comment
        </Button>
      </div>
    </form>
  );
}
