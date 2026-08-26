import { isPortalAuthed } from "@/lib/golftown-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GolfTownQueue } from "@/components/golf-town-queue";
import { PortalLogin, PortalSignOut } from "@/components/golftown-portal-auth";
import type { GolfTownOrder } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function GolfTownPortalPage() {
  if (!(await isPortalAuthed())) {
    return <PortalLogin />;
  }

  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("id").limit(1).maybeSingle();
  const { data: orders, error } = org
    ? await admin
        .from("golf_town_orders")
        .select("*")
        .eq("organization_id", org.id)
        .order("position", { ascending: true })
    : { data: [], error: null };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Golf Town Order Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit a print order and track its progress.
          </p>
        </div>
        <PortalSignOut />
      </div>

      <GolfTownQueue
        orders={(orders ?? []) as GolfTownOrder[]}
        organizationId={org?.id ?? ""}
        loadError={error ? "Something went wrong loading the queue." : null}
        mode="portal"
      />
    </div>
  );
}
