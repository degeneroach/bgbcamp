"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";

export async function markActivitySeen(eventId: string) {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  await supabase
    .from("activity_seen")
    .upsert(
      { user_id: userId, event_id: eventId },
      { onConflict: "user_id,event_id", ignoreDuplicates: true }
    );

  revalidatePath("/activity");
}

export async function markAllActivitySeen(eventIds: string[]) {
  if (eventIds.length === 0) return;
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  await supabase
    .from("activity_seen")
    .upsert(
      eventIds.map((eventId) => ({ user_id: userId, event_id: eventId })),
      { onConflict: "user_id,event_id", ignoreDuplicates: true }
    );

  revalidatePath("/activity");
}
