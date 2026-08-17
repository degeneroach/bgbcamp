"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { sanitizeHtml } from "@/lib/sanitize";
import { uniqueDocSlug } from "@/lib/wiki";

export interface WikiActionResult {
  ok: boolean;
  error?: string;
  slug?: string;
}

function wikiPaths(slug?: string) {
  revalidatePath("/tools/wiki");
  if (slug) {
    revalidatePath(`/tools/wiki/${slug}`);
    revalidatePath(`/tools/wiki/${slug}/edit`);
  }
}

// Creates an untitled draft in the given (or first) section and returns its
// slug so the client can jump straight into the editor.
export async function createWikiDoc(sectionId?: string): Promise<WikiActionResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  let targetSection = sectionId ?? null;
  if (!targetSection) {
    const { data: first } = await supabase
      .from("wiki_sections")
      .select("id")
      .eq("organization_id", organization.id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    targetSection = first?.id ?? null;
  }
  if (!targetSection) return { ok: false, error: "No wiki sections exist yet." };

  const slug = await uniqueDocSlug(supabase, organization.id, `untitled-${Date.now().toString(36)}`);

  const { error } = await supabase.from("wiki_docs").insert({
    organization_id: organization.id,
    section_id: targetSection,
    title: "Untitled",
    slug,
    created_by: userId,
    updated_by: userId,
  });

  if (error) return { ok: false, error: error.message };

  wikiPaths(slug);
  return { ok: true, slug };
}

export interface UpdateWikiDocInput {
  title?: string;
  sectionId?: string;
  bodyHtml?: string;
  isPublished?: boolean;
}

export async function updateWikiDoc(
  docId: string,
  input: UpdateWikiDocInput
): Promise<WikiActionResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const update: Partial<
    Pick<import("@/types/database").WikiDoc, "title" | "section_id" | "body_html" | "is_published" | "updated_by">
  > = { updated_by: userId };
  if (input.title !== undefined) update.title = input.title.trim() || "Untitled";
  if (input.sectionId !== undefined) update.section_id = input.sectionId;
  if (input.bodyHtml !== undefined) update.body_html = sanitizeHtml(input.bodyHtml);
  if (input.isPublished !== undefined) update.is_published = input.isPublished;

  const { data: updated, error } = await supabase
    .from("wiki_docs")
    .update(update)
    .eq("id", docId)
    .eq("organization_id", organization.id)
    .select("slug")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "Doc not found." };

  wikiPaths(updated.slug);
  return { ok: true, slug: updated.slug };
}

export async function deleteWikiDoc(docId: string): Promise<WikiActionResult> {
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("wiki_docs")
    .delete()
    .eq("id", docId)
    .eq("organization_id", organization.id);

  if (error) return { ok: false, error: error.message };

  wikiPaths();
  return { ok: true };
}
