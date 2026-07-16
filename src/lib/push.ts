import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PushPayload {
  title: string;
  body?: string;
  /** In-app path the notification opens when clicked. */
  url?: string;
  /** Collapse key — notifications with the same tag replace each other. */
  tag?: string;
}

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false; // push not set up — no-op
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:mitch@ezvape.com",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

// Delivers a Web Push to every browser the given users enabled notifications
// in. Uses the service-role client because the sender is a *different* user
// than the subscription owners. Never throws — a push failure must not break
// the action (comment/boost) that triggered it.
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  try {
    if (userIds.length === 0 || !ensureConfigured()) return;

    const supabase = createAdminClient();
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);
    if (!subs || subs.length === 0) return;

    const json = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            json
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          // Gone/expired subscription — clean it up so we stop retrying.
          if (status === 404 || status === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      })
    );
  } catch (error) {
    console.error("sendPushToUsers failed", error);
  }
}
