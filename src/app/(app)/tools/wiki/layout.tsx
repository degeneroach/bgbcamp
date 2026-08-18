import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSectionsWithDocs } from "@/lib/wiki";
import { WikiSidebar } from "@/components/wiki/wiki-sidebar";
import { Card } from "@/components/ui/card";

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const sections = await getSectionsWithDocs(supabase, organization.id);

  return (
    <Card className="grid grid-cols-1 overflow-hidden p-0 lg:grid-cols-[290px_minmax(0,1fr)] print:block print:border-0 print:shadow-none">
      <WikiSidebar sections={sections} />
      <div className="min-w-0 p-5 lg:p-6 print:p-0">{children}</div>
    </Card>
  );
}
