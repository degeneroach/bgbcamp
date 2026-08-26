import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { GolfTownQueue } from "@/components/golf-town-queue";
import type { GolfTownOrder } from "@/types/database";

export const metadata = {
  title: "Golf Town Queue · BGBCamp",
};

export default async function GolfTownQueuePage() {
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("golf_town_orders")
    .select("*")
    .eq("organization_id", organization.id)
    .order("position", { ascending: true });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Golf Town Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Print jobs from Golf Town — drag to reorder, top of the list prints first.
        </p>
        <p className="mt-1 text-xs text-muted-foreground md:hidden">
          Reordering is desktop-only; on mobile the queue is read-only.
        </p>
      </div>

      <GolfTownQueue
        orders={(orders ?? []) as GolfTownOrder[]}
        organizationId={organization.id}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
