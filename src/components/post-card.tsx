"use client";

import { useState, useTransition } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { RichTextEditor, RichTextContent } from "@/components/rich-text-editor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { PostCommentSection } from "@/components/post-comment-section";
import { updatePost } from "@/app/(app)/board/actions";
import { getPostTag, POST_TAGS } from "@/lib/post-tags";
import { cn } from "@/lib/utils";
import { Loader2, Pencil } from "lucide-react";
import type { PostComment, Profile } from "@/types/database";

export interface PostWithAuthor {
  id: string;
  organization_id: string;
  project_id: string | null;
  title: string;
  body_html: string;
  tag: string | null;
  created_at: string;
  updated_at: string;
  author: Profile | null;
}

export interface PostCommentWithAuthor extends PostComment {
  author: Profile | null;
}

export function PostCard({
  post,
  comments,
  members,
  currentUserId,
}: {
  post: PostWithAuthor;
  comments: PostCommentWithAuthor[];
  members: Profile[];
  currentUserId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body_html);
  const [tag, setTag] = useState<string | null>(post.tag);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOwn = post.author?.id === currentUserId;
  const wasEdited = post.updated_at > post.created_at;
  const postTag = getPostTag(post.tag);

  function startEditing() {
    setTitle(post.title);
    setBody(post.body_html);
    setTag(post.tag);
    setError(null);
    setEditing(true);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updatePost(post.id, title, body, tag);
      if (!result.ok) {
        setError(result.error ?? "Could not save the post.");
        return;
      }
      setEditing(false);
    });
  }

  return (
    <Card id={`post-${post.id}`} className="group/post flex flex-col gap-3 p-4 scroll-mt-24">
      <div className="flex items-center gap-2">
        <UserAvatar
          name={post.author?.full_name}
          email={post.author?.email ?? ""}
          avatarUrl={post.author?.avatar_url}
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{displayName(post.author)}</span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(post.created_at)}
            {wasEdited && " · edited"}
          </span>
        </div>
        {isOwn && !editing && (
          <button
            type="button"
            onClick={startEditing}
            className="ml-auto rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/post:opacity-100"
            aria-label="Edit post"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
          <RichTextEditor
            content={body}
            onChange={setBody}
            placeholder="Share an update..."
            projectId={post.organization_id}
            enableImages
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {POST_TAGS.map((option) => {
                const active = tag === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTag(active ? null : option.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                      active ? option.activeClass : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <option.icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="cta" size="sm" onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{post.title}</h3>
            {postTag && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  postTag.badgeClass
                )}
              >
                <postTag.icon className="h-3 w-3" />
                {postTag.label}
              </span>
            )}
          </div>
          <RichTextContent html={post.body_html} />
        </div>
      )}

      <PostCommentSection
        postId={post.id}
        postTitle={post.title}
        comments={comments}
        members={members}
        uploadScopeId={post.organization_id}
      />
    </Card>
  );
}
