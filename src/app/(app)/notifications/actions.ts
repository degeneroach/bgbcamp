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

export async function markAllNotificationsRead() {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false);

  revalidatePath("/", "layout");
}
