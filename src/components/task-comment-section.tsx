"use client";

import { useState, useTransition } from "react";
import { CommentForm } from "@/components/comment-form";
import { UserAvatar } from "@/components/user-avatar";
import { RichTextEditor, RichTextContent } from "@/components/rich-text-editor";
import { BoostBar, type BoostWithAuthor } from "@/components/boost-bar";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import {
  createTaskComment,
  updateTaskComment,
  deleteTaskComment,
} from "@/app/(app)/projects/[slug]/tasks/actions";
import type { Profile, TaskComment } from "@/types/database";
import type { MentionCandidate } from "@/lib/tiptap-mention-suggestion";

function CommentItem({
  comment,
  taskId,
  projectId,
  projectSlug,
  taskTitle,
  boosts,
  currentUserId,
  mentionCandidates,
}: {
  comment: TaskComment & { author: Profile | null };
  taskId: string;
  projectId: string;
  projectSlug: string;
  taskTitle: string;
  boosts: BoostWithAuthor[];
  currentUserId: string;
  mentionCandidates: MentionCandidate[];
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
      <UserAvatar
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
          {isOwn && !editing && (
            <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover/comment:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setDraft(comment.body);
                  setEditing(true);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Edit comment"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3 w-3" />
              </button>
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
        />
      ))}
      <CommentForm
        projectId={projectId}
        mentionCandidates={mentionCandidates}
        onSubmit={(bodyHtml) => createTaskComment(taskId, projectId, projectSlug, taskTitle, bodyHtml)}
      />
    </div>
  );
}
