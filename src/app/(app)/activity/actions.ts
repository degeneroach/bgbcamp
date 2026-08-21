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

// Marks EVERY teammate event as seen, not just the ones on screen — the
// "New for you" card shows at most 30, so marking only those made the next
// batch of a large backlog slide in and look like the click didn't stick.
export async function markAllActivitySeen() {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("activity_events")
    .select("id")
    .eq("organization_id", organization.id)
    .neq("actor_id", userId);
  const ids = (events ?? []).map((e) => e.id);

  for (let i = 0; i < ids.length; i += 500) {
    await supabase.from("activity_seen").upsert(
      ids.slice(i, i + 500).map((eventId) => ({ user_id: userId, event_id: eventId })),
      { onConflict: "user_id,event_id", ignoreDuplicates: true }
    );
  }

  revalidatePath("/activity");
}
