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

  // Page past Supabase's 1000-row response cap so a large backlog is
  // really all marked, not just the first thousand.
  const ids: string[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data: events } = await supabase
      .from("activity_events")
      .select("id")
      .eq("organization_id", organization.id)
      .neq("actor_id", userId)
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    ids.push(...(events ?? []).map((e) => e.id));
    if (!events || events.length < 1000) break;
  }

  for (let i = 0; i < ids.length; i += 500) {
    await supabase.from("activity_seen").upsert(
      ids.slice(i, i + 500).map((eventId) => ({ user_id: userId, event_id: eventId })),
      { onConflict: "user_id,event_id", ignoreDuplicates: true }
    );
  }

  revalidatePath("/activity");
}
