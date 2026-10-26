import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import {
  ContributionCalendar,
  type ContributionEvent,
} from "@/components/contribution-calendar";
import { subMonths, startOfMonth } from "date-fns";
import type { Profile } from "@/types/database";

export default async function ActivityCalendarPage() {
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  // A year of history so the client can page back month by month.
  const since = startOfMonth(subMonths(new Date(), 11)).toISOString();

  const { data: memberRows } = await supabase
    .from("organization_members")
    .select("profiles(*)")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true });

  // Supabase caps every response at 1000 rows regardless of .limit(), and
  // with no order the NEWEST rows were the ones silently dropped once the
  // org passed 1000 events — recent days showed empty. Page through the
  // window explicitly (newest first, so even a truncated read stays fresh).
  const events: { actor_id: string | null; created_at: string }[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data: page } = await supabase
      .from("activity_events")
      .select("actor_id, created_at")
      .eq("organization_id", organization.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    events.push(...(page ?? []));
    if (!page || page.length < 1000) break;
  }

  const members = (memberRows ?? [])
    .map((row) => row.profiles as unknown as Profile | null)
    .filter((p): p is Profile => p !== null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who&apos;s been putting in the work — every comment, task, boost, and upload counts.
        </p>
      </div>
      <ContributionCalendar members={members} events={events as ContributionEvent[]} />
    </div>
  );
}
