"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { logActivity } from "@/lib/activity";
import { sanitizeHtml } from "@/lib/sanitize";
import { extractMentionIds, htmlToExcerpt } from "@/lib/mentions";
import { createMentionNotifications } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";
import { displayName } from "@/lib/display-name";
import { POST_TAG_VALUES } from "@/lib/post-tags";

export interface PostResult {
  ok: boolean;
  error?: string;
}

export async function createPost(
  title: string,
  bodyHtml: string,
  tag: string | null = null
): Promise<PostResult> {
  if (title.trim().length < 2) {
    return { ok: false, error: "Give the post a title." };
  }
  if (tag !== null && !POST_TAG_VALUES.includes(tag)) {
    return { ok: false, error: "Unknown post tag." };
  }

  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      organization_id: organization.id,
      author_id: userId,
      title: title.trim(),
      body_html: sanitizeHtml(bodyHtml),
      tag,
    })
    .select()
    .single();

  if (error || !post) {
    return { ok: false, error: error?.message ?? "Could not create post." };
  }

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId: null,
    actorId: userId,
    entityType: "post",
    entityId: post.id,
    action: "post.created",
    metadata: { title: post.title },
  });

  revalidatePath("/board");
  revalidatePath("/activity");
  return { ok: true };
}

export async function createPostComment(
  postId: string,
  postTitle: string,
  bodyHtml: string
): Promise<PostResult> {
  const cleaned = sanitizeHtml(bodyHtml);
  if (htmlToExcerpt(cleaned).length < 1) {
    return { ok: false, error: "Comment can't be empty." };
  }

  const { userId, profile, organization } = await requireCurrentUser();
  const supabase = await createClient();

  // The post carries its own org/project context (legacy posts keep a
  // project); read it rather than trusting the client.
  const { data: post } = await supabase
    .from("posts")
    .select("id, organization_id, project_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.organization_id !== organization.id) {
    return { ok: false, error: "Post not found." };
  }

  const { data: comment, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: userId, body: cleaned })
    .select()
    .single();

  if (error || !comment) {
    return { ok: false, error: error?.message ?? "Could not add comment." };
  }

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId: post.project_id,
    actorId: userId,
    entityType: "post_comment",
    entityId: comment.id,
    action: "post_comment.created",
    metadata: { postTitle, postId, bodyPreview: htmlToExcerpt(cleaned) },
  });

  const mentionRecipients = await createMentionNotifications(supabase, {
    organizationId: organization.id,
    projectId: post.project_id,
    actorId: userId,
    mentionedUserIds: extractMentionIds(cleaned),
    entityType: "post_comment",
    entityId: comment.id,
    postId,
    bodyHtml: cleaned,
  });

  await sendPushToUsers(mentionRecipients, {
    title: `${displayName(profile)} mentioned you`,
    body: `${postTitle} — ${htmlToExcerpt(cleaned)}`,
    url: `/board#post-${postId}`,
    tag: `post-comment-${comment.id}`,
  });

  revalidatePath("/board");
  revalidatePath("/activity");
  return { ok: true };
}
