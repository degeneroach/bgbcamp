import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getOrganizationMembers } from "@/lib/projects";
import { PostComposer } from "@/components/post-composer";
import { PostCard, type PostCommentWithAuthor, type PostWithAuthor } from "@/components/post-card";

export default async function ProjectMessageBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const project = await getProjectBySlug(supabase, organization.id, slug);
  const members = await getOrganizationMembers(supabase, organization.id);

  const { data: posts } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const postIds = (posts ?? []).map((p) => p.id);

  const { data: comments } = postIds.length
    ? await supabase
        .from("post_comments")
        .select("*, author:profiles!author_id(*)")
        .in("post_id", postIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const commentsByPost = new Map<string, PostCommentWithAuthor[]>();
  for (const comment of (comments ?? []) as unknown as PostCommentWithAuthor[]) {
    const list = commentsByPost.get(comment.post_id) ?? [];
    list.push(comment);
    commentsByPost.set(comment.post_id, list);
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PostComposer projectId={project.id} projectSlug={slug} />
      {(posts ?? []).length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No posts yet. Share the first update with your team.
        </p>
      ) : (
        (posts as unknown as PostWithAuthor[]).map((post) => (
          <PostCard
            key={post.id}
            post={post}
            comments={commentsByPost.get(post.id) ?? []}
            projectSlug={slug}
            members={members}
          />
        ))
      )}
    </div>
  );
}
