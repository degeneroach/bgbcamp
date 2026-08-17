import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getDocBySlug } from "@/lib/wiki";
import { WikiEditor } from "@/components/wiki/wiki-editor";
import type { WikiSection } from "@/types/database";

export default async function WikiDocEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  const [doc, { data: sections }] = await Promise.all([
    getDocBySlug(supabase, organization.id, slug),
    supabase
      .from("wiki_sections")
      .select("id, name")
      .eq("organization_id", organization.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!doc) notFound();

  return (
    <WikiEditor
      doc={doc}
      sections={(sections ?? []) as Pick<WikiSection, "id" | "name">[]}
      organizationId={organization.id}
    />
  );
}
