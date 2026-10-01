"use client";

import { useRef, useState, useTransition } from "react";
import { CommentForm, type ComposerSeed } from "@/components/comment-form";
import { EnlargeableAvatar } from "@/components/enlargeable-avatar";
import { RichTextEditor, RichTextContent } from "@/components/rich-text-editor";
import { BoostBar, type BoostWithAuthor } from "@/components/boost-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Pencil, TextQuote, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { htmlToExcerpt } from "@/lib/mentions";
import {
  createTaskComment,
  updateTaskComment,
  deleteTaskComment,
} from "@/app/(app)/projects/[slug]/tasks/actions";
import type { Profile, TaskComment } from "@/types/database";
import type { MentionCandidate } from "@/lib/tiptap-mention-suggestion";

// Builds the WhatsApp-style quoted block inserted into the composer.
// Nested quotes and media are stripped so chains stay readable.
function buildQuoteHtml(authorName: string, bodyHtml: string): string {
  const cleaned = bodyHtml
    .replace(/<blockquote>[\s\S]*?<\/blockquote>/g, "")
    .replace(/<img[^>]*>/g, "")
    .replace(/<video[^>]*>[\s\S]*?<\/video>|<video[^>]*\/>/g, "");
  const safeAuthor = authorName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const quotedBody = htmlToExcerpt(cleaned) ? cleaned : "<p><em>(attachment)</em></p>";
  return `<blockquote><p><strong>${safeAuthor}:</strong></p>${quotedBody}</blockquote><p></p>`;
}

function CommentItem({
  comment,
  taskId,
  projectId,
  projectSlug,
  taskTitle,
  boosts,
  currentUserId,
  mentionCandidates,
  onQuote,
}: {
  comment: TaskComment & { author: Profile | null };
  taskId: string;
  projectId: string;
  projectSlug: string;
  taskTitle: string;
  boosts: BoostWithAuthor[];
  currentUserId: string;
  mentionCandidates: MentionCandidate[];
  onQuote: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [isPending, startTransition] = useTransition();
  const isOwn = comment.author?.id === currentUserId;
  const wasEdited = comment.updated_at > comment.created_at;

  function handleSave() {
    startTransition(async () => {
      const result = await updateTaskComment(comment.id, projectSlug, taskId, draft);
      if (result.ok) setEditing(false);
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this comment?")) return;
    startTransition(async () => {
      await deleteTaskComment(comment.id, projectSlug, taskId);
    });
  }

  return (
    <div className="group/comment flex items-start gap-2">
      <EnlargeableAvatar
        name={comment.author?.full_name}
        email={comment.author?.email ?? ""}
        avatarUrl={comment.author?.avatar_url}
        className="h-6 w-6"
      />
      <div className="flex min-w-0 flex-1 flex-col rounded-md bg-muted/50 px-3 py-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium">{displayName(comment.author)}</span>
          <span className="text-[11px] text-muted-foreground">
            {timeAgo(comment.created_at)}
            {wasEdited && " · edited"}
          </span>
          {!editing && (
            <span className="ml-auto flex items-center opacity-0 transition-opacity group-hover/comment:opacity-100 has-[[aria-expanded=true]]:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="rounded p-1 text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
                  aria-label="Comment actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onSelect={onQuote}>
                    <TextQuote className="h-4 w-4" />
                    Quote
                  </DropdownMenuItem>
                  {isOwn && (
                    <>
                      <DropdownMenuItem
                        onSelect={() => {
                          setDraft(comment.body);
                          setEditing(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-1.5 flex flex-col gap-2">
            <RichTextEditor
              content={draft}
              onChange={setDraft}
              placeholder="Edit your comment..."
              minHeight="4rem"
              projectId={projectId}
              enableImages
              mentionCandidates={mentionCandidates}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <RichTextContent html={comment.body} className="text-sm" />
            <div className="mt-1.5">
              <BoostBar
                entityType="task_comment"
                entityId={comment.id}
                taskId={taskId}
                projectId={projectId}
                projectSlug={projectSlug}
                taskTitle={taskTitle}
                boosts={boosts}
                currentUserId={currentUserId}
                size="sm"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function TaskCommentSection({
  taskId,
  projectId,
  projectSlug,
  taskTitle,
  comments,
  members,
  boosts,
  currentUserId,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  taskTitle: string;
  comments: (TaskComment & { author: Profile | null })[];
  members: Profile[];
  boosts: BoostWithAuthor[];
  currentUserId: string;
}) {
  const mentionCandidates = members.map((m) => ({ id: m.id, label: displayName(m) }));
  const [seed, setSeed] = useState<ComposerSeed>({ html: "", version: 0 });
  const composerRef = useRef<HTMLDivElement>(null);

  function quote(comment: TaskComment & { author: Profile | null }) {
    setSeed((prev) => ({
      html: buildQuoteHtml(displayName(comment.author), comment.body),
      version: prev.version + 1,
    }));
    // Let the seeded editor mount, then bring it into view.
    setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Comments</span>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          taskId={taskId}
          projectId={projectId}
          projectSlug={projectSlug}
          taskTitle={taskTitle}
          boosts={boosts.filter((b) => b.entity_id === comment.id)}
          currentUserId={currentUserId}
          mentionCandidates={mentionCandidates}
          onQuote={() => quote(comment)}
        />
      ))}
      <div ref={composerRef}>
        <CommentForm
          projectId={projectId}
          mentionCandidates={mentionCandidates}
          seed={seed}
          onSubmit={(bodyHtml) => createTaskComment(taskId, projectId, projectSlug, taskTitle, bodyHtml)}
        />
      </div>
    </div>
  );
}
