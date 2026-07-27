import { Megaphone } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { RichTextContent } from "@/components/rich-text-editor";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { PostCommentSection } from "@/components/post-comment-section";
import type { PostComment, Profile } from "@/types/database";

export interface PostWithAuthor {
  id: string;
  project_id: string;
  title: string;
  body_html: string;
  tag: string | null;
  created_at: string;
  author: Profile | null;
}

export interface PostCommentWithAuthor extends PostComment {
  author: Profile | null;
}

export function PostCard({
  post,
  comments,
  projectSlug,
  members,
}: {
  post: PostWithAuthor;
  comments: PostCommentWithAuthor[];
  projectSlug: string;
  members: Profile[];
}) {
  return (
    <Card id={`post-${post.id}`} className="flex flex-col gap-3 p-4 scroll-mt-24">
      <div className="flex items-center gap-2">
        <UserAvatar
          name={post.author?.full_name}
          email={post.author?.email ?? ""}
          avatarUrl={post.author?.avatar_url}
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">
            {displayName(post.author)}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
        </div>
      </div>
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{post.title}</h3>
          {post.tag === "announcement" && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <Megaphone className="h-3 w-3" />
              Announcement
            </span>
          )}
        </div>
        <RichTextContent html={post.body_html} />
      </div>
      <PostCommentSection
        projectId={post.project_id}
        projectSlug={projectSlug}
        postId={post.id}
        postTitle={post.title}
        comments={comments}
        members={members}
      />
    </Card>
  );
}
