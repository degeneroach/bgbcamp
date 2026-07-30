import Link from "next/link";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationMembers } from "@/lib/projects";
import { PostComposer } from "@/components/post-composer";
import { PostCard, type PostCommentWithAuthor, type PostWithAuthor } from "@/components/post-card";
import { POST_TAGS, POST_TAG_VALUES } from "@/lib/post-tags";
import { cn } from "@/lib/utils";

export default async function MessageBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const sp = await searchParams;
  const activeTag = sp.tag && POST_TAG_VALUES.includes(sp.tag) ? sp.tag : null;
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();
  const members = await getOrganizationMembers(supabase, organization.id);

  let postsQuery = supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  if (activeTag) postsQuery = postsQuery.eq("tag", activeTag);

  const [{ data: posts }, { data: allTags }] = await Promise.all([
    postsQuery,
    // Unfiltered tag list for the count badges on the filter chips.
    supabase.from("posts").select("tag").eq("organization_id", organization.id),
  ]);

  const tagCounts = new Map<string, number>();
  for (const row of allTags ?? []) {
    if (row.tag) tagCounts.set(row.tag, (tagCounts.get(row.tag) ?? 0) + 1);
  }
  const totalPosts = (allTags ?? []).length;

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Message Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Team-wide updates, announcements, SOPs, and resources.
        </p>
      </div>

      <PostComposer organizationId={organization.id} />

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/board"
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
            !activeTag
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          All posts
          <span
            className={cn(
              "rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums",
              !activeTag ? "bg-primary/20" : "bg-muted"
            )}
          >
            {totalPosts}
          </span>
        </Link>
        {POST_TAGS.map((tag) => {
          const count = tagCounts.get(tag.value) ?? 0;
          return (
            <Link
              key={tag.value}
              href={`/board?tag=${tag.value}`}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                activeTag === tag.value ? tag.activeClass : "text-muted-foreground hover:bg-muted"
              )}
            >
              <tag.icon className="h-3.5 w-3.5" />
              {tag.label}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums",
                    activeTag === tag.value ? "bg-black/10 dark:bg-white/15" : "bg-muted"
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {(posts ?? []).length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {activeTag
            ? "Nothing filed here yet."
            : "No posts yet. Share the first update with your team."}
        </p>
      ) : (
        (posts as unknown as PostWithAuthor[]).map((post) => (
          <PostCard
            key={post.id}
            post={post}
            comments={commentsByPost.get(post.id) ?? []}
            members={members}
            currentUserId={userId}
          />
        ))
      )}
    </div>
  );
}
