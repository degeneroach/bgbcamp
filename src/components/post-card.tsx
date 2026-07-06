import { UserAvatar } from "@/components/user-avatar";
import { RichTextContent } from "@/components/rich-text-editor";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/format";
import { PostCommentSection } from "@/components/post-comment-section";
import type { PostComment, Profile } from "@/types/database";

export interface PostWithAuthor {
  id: string;
  project_id: string;
  title: string;
  body_html: string;
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
            {post.author?.full_name || post.author?.email || "Someone"}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
        </div>
      </div>
      <div>
        <h3 className="mb-1 font-medium">{post.title}</h3>
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
