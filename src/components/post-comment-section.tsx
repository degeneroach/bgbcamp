"use client";

import { CommentForm } from "@/components/comment-form";
import { EnlargeableAvatar } from "@/components/enlargeable-avatar";
import { RichTextContent } from "@/components/rich-text-editor";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { createPostComment } from "@/app/(app)/board/actions";
import type { PostCommentWithAuthor } from "@/components/post-card";
import type { Profile } from "@/types/database";

export function PostCommentSection({
  postId,
  postTitle,
  comments,
  members,
  uploadScopeId,
}: {
  postId: string;
  postTitle: string;
  comments: PostCommentWithAuthor[];
  members: Profile[];
  /** Folder scope for media uploads (the organization id). */
  uploadScopeId: string;
}) {
  const mentionCandidates = members.map((m) => ({ id: m.id, label: displayName(m) }));

  return (
    <div className="flex flex-col gap-3">
      {comments.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <EnlargeableAvatar
                  name={comment.author?.full_name}
                  email={comment.author?.email ?? ""}
                  avatarUrl={comment.author?.avatar_url}
                  className="h-6 w-6"
                />
                <div className="flex flex-1 flex-col rounded-md bg-muted/50 px-3 py-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{displayName(comment.author)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <RichTextContent html={comment.body} className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <CommentForm
        projectId={uploadScopeId}
        mentionCandidates={mentionCandidates}
        onSubmit={(bodyHtml) => createPostComment(postId, postTitle, bodyHtml)}
      />
    </div>
  );
}
