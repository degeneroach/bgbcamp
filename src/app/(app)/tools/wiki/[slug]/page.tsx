import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getDocBySlug } from "@/lib/wiki";
import { RichTextContent } from "@/components/rich-text-editor";
import { WikiDocMenu } from "@/components/wiki/wiki-doc-menu";
import { Button } from "@/components/ui/button";
import { displayName } from "@/lib/display-name";
import type { WikiSection } from "@/types/database";

export default async function WikiDocPage({
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
      .select("id, name, business")
      .eq("organization_id", organization.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!doc) notFound();

  return (
    <article className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">
        {doc.section?.business ? `${doc.section.business} › ` : ""}{doc.section?.name ?? "Wiki"} <span aria-hidden>›</span> {doc.title}
      </p>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {doc.title}
            {!doc.is_published && (
              <span className="ml-2 align-middle rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Draft
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated {format(new Date(doc.updated_at), "MMM d, yyyy")} by{" "}
            {displayName(doc.updated_by_profile)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            render={<Link href={`/tools/wiki/${doc.slug}/edit`} />}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <WikiDocMenu
            docId={doc.id}
            docTitle={doc.title}
            currentSectionId={doc.section_id}
            sections={(sections ?? []) as Pick<WikiSection, "id" | "name" | "business">[]}
          />
        </div>
      </div>

      {doc.body_html.trim() ? (
        <div className="mt-4">
          <RichTextContent
            html={doc.body_html}
            className="max-w-[760px] text-base leading-[1.7] [&_a]:text-primary"
          />
        </div>
      ) : (
        <p className="mt-8 text-sm italic text-muted-foreground">
          Nothing written yet — hit Edit to start this SOP.
        </p>
      )}
    </article>
  );
}
