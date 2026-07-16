"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";

export async function markNotificationRead(notificationId: string) {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("recipient_id", userId);

  revalidatePath("/", "layout");
}

export async function savePushSubscription(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    { onConflict: "endpoint" }
  );
}

export async function removePushSubscription(endpoint: string) {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", userId);
}

export async function markAllNotificationsRead(scope: "mentions" | "boosts" = "mentions") {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false);

  query = scope === "boosts" ? query.eq("entity_type", "boost") : query.neq("entity_type", "boost");

  await query;

  revalidatePath("/", "layout");
}
