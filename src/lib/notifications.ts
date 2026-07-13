import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationEntityType } from "@/types/database";
import { htmlToExcerpt } from "@/lib/mentions";

interface CreateMentionNotificationsParams {
  organizationId: string;
  projectId: string;
  actorId: string;
  mentionedUserIds: string[];
  entityType: NotificationEntityType;
  entityId: string;
  taskId?: string | null;
  postId?: string | null;
  bodyHtml: string;
}

// Creates one notification per mentioned teammate (excluding the author
// mentioning themselves). These power the "priority" mentions queue shown
// in the notification bell, separate from the general activity feed.
export async function createMentionNotifications(
  supabase: SupabaseClient<Database>,
  params: CreateMentionNotificationsParams
) {
  const recipients = Array.from(new Set(params.mentionedUserIds)).filter(
    (id) => id !== params.actorId
  );
  if (recipients.length === 0) return;

  const excerpt = htmlToExcerpt(params.bodyHtml);

  const { error } = await supabase.from("notifications").insert(
    recipients.map((recipientId) => ({
      organization_id: params.organizationId,
      recipient_id: recipientId,
      actor_id: params.actorId,
      project_id: params.projectId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      task_id: params.taskId ?? null,
      post_id: params.postId ?? null,
      excerpt,
    }))
  );

  if (error) {
    console.error("Failed to create mention notifications", error);
  }
}

export interface NotificationWithRelations {
  id: string;
  read: boolean;
  excerpt: string;
  created_at: string;
  entity_type: NotificationEntityType;
  actor: { full_name: string | null; email: string; avatar_url: string | null } | null;
  project: { slug: string; name: string } | null;
  task: { id: string; title: string } | null;
  post: { id: string; title: string } | null;
}

export async function getRecentNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 20
): Promise<{ notifications: NotificationWithRelations[]; unreadCount: number }> {
  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id, read, excerpt, created_at, entity_type, actor:profiles!actor_id(full_name, email, avatar_url), project:projects!project_id(slug, name), task:tasks!task_id(id, title), post:posts!post_id(id, title)"
      )
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("read", false),
  ]);

  return {
    notifications: (notifications ?? []) as unknown as NotificationWithRelations[],
    unreadCount: unreadCount ?? 0,
  };
}

export function notificationHref(notification: NotificationWithRelations): string {
  if (!notification.project) return "/activity";
  if (
    (notification.entity_type === "task_comment" ||
      notification.entity_type === "task" ||
      notification.entity_type === "boost") &&
    notification.task
  ) {
    return `/projects/${notification.project.slug}/tasks/${notification.task.id}`;
  }
  if (notification.entity_type === "post_comment" && notification.post) {
    return `/projects/${notification.project.slug}/board#post-${notification.post.id}`;
  }
  return `/projects/${notification.project.slug}`;
}
