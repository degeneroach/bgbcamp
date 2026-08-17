import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, WikiDoc, WikiSection } from "@/types/database";
import { slugify } from "@/lib/slug";

export interface WikiDocListItem {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  section_id: string;
}

export interface WikiSectionWithDocs extends WikiSection {
  docs: WikiDocListItem[];
}

export async function getSectionsWithDocs(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<WikiSectionWithDocs[]> {
  const [{ data: sections }, { data: docs }] = await Promise.all([
    supabase
      .from("wiki_sections")
      .select("*")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("wiki_docs")
      .select("id, title, slug, is_published, section_id")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const docsBySection = new Map<string, WikiDocListItem[]>();
  for (const doc of (docs ?? []) as WikiDocListItem[]) {
    const list = docsBySection.get(doc.section_id) ?? [];
    list.push(doc);
    docsBySection.set(doc.section_id, list);
  }

  return ((sections ?? []) as WikiSection[]).map((section) => ({
    ...section,
    docs: docsBySection.get(section.id) ?? [],
  }));
}

export type WikiDocFull = WikiDoc & {
  section: WikiSection | null;
  updated_by_profile: Pick<Profile, "full_name" | "email"> | null;
};

export async function getDocBySlug(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  slug: string
): Promise<WikiDocFull | null> {
  const { data } = await supabase
    .from("wiki_docs")
    .select(
      "*, section:wiki_sections!section_id(*), updated_by_profile:profiles!updated_by(full_name, email)"
    )
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .maybeSingle();

  return (data as unknown as WikiDocFull) ?? null;
}

/** Slug from title, de-duplicated with a numeric suffix within the org. */
export async function uniqueDocSlug(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  title: string
): Promise<string> {
  const base = slugify(title) || "untitled";
  const { data: existing } = await supabase
    .from("wiki_docs")
    .select("slug")
    .eq("organization_id", organizationId)
    .like("slug", `${base}%`);

  const taken = new Set((existing ?? []).map((row) => row.slug));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}
