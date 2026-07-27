import { UserAvatar } from "@/components/user-avatar";
import { RichTextContent } from "@/components/rich-text-editor";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { PostCommentSection } from "@/components/post-comment-section";
import { getPostTag } from "@/lib/post-tags";
import { cn } from "@/lib/utils";
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
          {(() => {
            const tag = getPostTag(post.tag);
            if (!tag) return null;
            return (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  tag.badgeClass
                )}
              >
                <tag.icon className="h-3 w-3" />
                {tag.label}
              </span>
            );
          })()}
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
