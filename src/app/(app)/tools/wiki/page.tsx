import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSectionsWithDocs } from "@/lib/wiki";
import { NewDocButton } from "@/components/wiki/new-doc-button";

export const metadata = { title: "SOP Wiki · BGBCamp" };

export default async function WikiHomePage() {
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const sections = await getSectionsWithDocs(supabase, organization.id);

  // Sections are ordered Onboarding-first; land on the first doc that exists.
  const firstDoc = sections.flatMap((s) => s.docs)[0];
  if (firstDoc) redirect(`/tools/wiki/${firstDoc.slug}`);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Start documenting</h1>
        <p className="text-sm text-muted-foreground">
          Write down how the business runs — daily, weekly, and monthly — so anyone
          can pick it up.
        </p>
        <NewDocButton />
      </div>
    </div>
  );
}
