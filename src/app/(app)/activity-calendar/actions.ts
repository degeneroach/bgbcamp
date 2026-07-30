"use server";

import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import type { ActivityEvent, Profile } from "@/types/database";

export type DayActivityEvent = ActivityEvent & {
  actor: Profile | null;
  project: { slug: string; name: string } | null;
};

// Full detail for one calendar day, fetched on demand when a day cell is
// clicked. The client passes the local-timezone day bounds as ISO strings.
export async function getDayActivity(
  startIso: string,
  endIso: string,
  actorId: string | null
): Promise<DayActivityEvent[]> {
  const { organization } = await requireCurrentUser();

  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  // Sanity: a "day" request never spans more than 48h (DST-proof).
  if (end.getTime() - start.getTime() > 48 * 60 * 60 * 1000 || end <= start) return [];

  const supabase = await createClient();
  let query = supabase
    .from("activity_events")
    .select("*, actor:profiles!actor_id(*), project:projects!project_id(slug, name)")
    .eq("organization_id", organization.id)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: true })
    .limit(200);

  if (actorId) query = query.eq("actor_id", actorId);

  const { data } = await query;
  return (data ?? []) as unknown as DayActivityEvent[];
}
