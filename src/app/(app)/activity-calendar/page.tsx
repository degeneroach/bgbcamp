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

  const since = startOfMonth(subMonths(new Date(), 2)).toISOString();

  const [{ data: memberRows }, { data: events }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("profiles(*)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("activity_events")
      .select("actor_id, created_at")
      .eq("organization_id", organization.id)
      .gte("created_at", since)
      .limit(5000),
  ]);

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
      <ContributionCalendar
        members={members}
        events={(events ?? []) as ContributionEvent[]}
      />
    </div>
  );
}
