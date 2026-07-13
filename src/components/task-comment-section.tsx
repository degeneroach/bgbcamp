"use client";

import { CommentForm } from "@/components/comment-form";
import { UserAvatar } from "@/components/user-avatar";
import { RichTextContent } from "@/components/rich-text-editor";
import { BoostBar, type BoostWithAuthor } from "@/components/boost-bar";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { createTaskComment } from "@/app/(app)/projects/[slug]/tasks/actions";
import type { Profile, TaskComment } from "@/types/database";

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
        <div key={comment.id} className="flex items-start gap-2">
          <UserAvatar
            name={comment.author?.full_name}
            email={comment.author?.email ?? ""}
            avatarUrl={comment.author?.avatar_url}
            className="h-6 w-6"
          />
          <div className="flex flex-1 flex-col rounded-md bg-muted/50 px-3 py-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium">{displayName(comment.author)}</span>
              <span className="text-[11px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
            </div>
            <RichTextContent html={comment.body} className="text-sm" />
            <div className="mt-1.5">
              <BoostBar
                entityType="task_comment"
                entityId={comment.id}
                taskId={taskId}
                projectId={projectId}
                projectSlug={projectSlug}
                taskTitle={taskTitle}
                boosts={boosts.filter((b) => b.entity_id === comment.id)}
                currentUserId={currentUserId}
                size="sm"
              />
            </div>
          </div>
        </div>
      ))}
      <CommentForm
        projectId={projectId}
        mentionCandidates={mentionCandidates}
        onSubmit={(bodyHtml) => createTaskComment(taskId, projectId, projectSlug, taskTitle, bodyHtml)}
      />
    </div>
  );
}
