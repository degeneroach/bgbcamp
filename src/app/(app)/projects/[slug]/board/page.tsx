import Link from "next/link";
import { Megaphone } from "lucide-react";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getOrganizationMembers } from "@/lib/projects";
import { PostComposer } from "@/components/post-composer";
import { PostCard, type PostCommentWithAuthor, type PostWithAuthor } from "@/components/post-card";
import { cn } from "@/lib/utils";

export default async function ProjectMessageBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { slug } = await params;
  const { filter } = await searchParams;
  const announcementsOnly = filter === "announcements";
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const project = await getProjectBySlug(supabase, organization.id, slug);
  const members = await getOrganizationMembers(supabase, organization.id);

  let postsQuery = supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });
  if (announcementsOnly) postsQuery = postsQuery.eq("tag", "announcement");

  const { data: posts } = await postsQuery;

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

      <div className="flex items-center gap-2">
        <Link
          href={`/projects/${slug}/board`}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            !announcementsOnly
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          All posts
        </Link>
        <Link
          href={`/projects/${slug}/board?filter=announcements`}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
            announcementsOnly
              ? "border-amber-400 bg-amber-400/15 font-medium text-amber-600 dark:text-amber-400"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Megaphone className="h-3.5 w-3.5" />
          Announcements
        </Link>
      </div>

      {(posts ?? []).length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {announcementsOnly
            ? "No announcements yet."
            : "No posts yet. Share the first update with your team."}
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
