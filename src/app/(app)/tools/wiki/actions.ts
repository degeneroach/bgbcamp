"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { sanitizeHtml } from "@/lib/sanitize";
import { logActivity } from "@/lib/activity";
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

  const { data: existing } = await supabase
    .from("wiki_docs")
    .select("title, is_published")
    .eq("id", docId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Doc not found." };

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
    .select("slug, title")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "Doc not found." };

  // Activity feed, without autosave spam:
  // - The first save that names an "Untitled" doc counts as creating it.
  // - Flipping Published on gets its own event.
  // - Everything else logs an update at most once per hour per doc.
  const base = {
    organizationId: organization.id,
    actorId: userId,
    entityType: "wiki_doc" as const,
    entityId: docId,
    metadata: { title: updated.title, slug: updated.slug },
  };
  if (existing.title === "Untitled" && updated.title !== "Untitled") {
    await logActivity(supabase, { ...base, action: "wiki.created" });
  } else if (input.isPublished === true && !existing.is_published) {
    await logActivity(supabase, { ...base, action: "wiki.published" });
  } else {
    const { data: recent } = await supabase
      .from("activity_events")
      .select("created_at")
      .eq("entity_id", docId)
      .in("action", ["wiki.updated", "wiki.created", "wiki.published"])
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1);
    if (!recent || recent.length === 0) {
      await logActivity(supabase, { ...base, action: "wiki.updated" });
    }
  }

  wikiPaths(updated.slug);
  return { ok: true, slug: updated.slug };
}

export async function deleteWikiDoc(docId: string): Promise<WikiActionResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("wiki_docs")
    .select("title")
    .eq("id", docId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  const { error } = await supabase
    .from("wiki_docs")
    .delete()
    .eq("id", docId)
    .eq("organization_id", organization.id);

  if (error) return { ok: false, error: error.message };

  if (existing && existing.title !== "Untitled") {
    await logActivity(supabase, {
      organizationId: organization.id,
      actorId: userId,
      entityType: "wiki_doc",
      entityId: docId,
      action: "wiki.deleted",
      metadata: { title: existing.title },
    });
  }

  wikiPaths();
  return { ok: true };
}

export async function duplicateWikiDoc(docId: string): Promise<WikiActionResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("wiki_docs")
    .select("*")
    .eq("id", docId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!source) return { ok: false, error: "Doc not found." };

  const title = `${source.title} (copy)`;
  const slug = await uniqueDocSlug(supabase, organization.id, title);

  const { data: copy, error } = await supabase
    .from("wiki_docs")
    .insert({
      organization_id: organization.id,
      section_id: source.section_id,
      title,
      slug,
      body_html: source.body_html,
      is_published: false,
      created_by: userId,
      updated_by: userId,
    })
    .select("id, slug")
    .single();

  if (error || !copy) return { ok: false, error: error?.message ?? "Could not duplicate." };

  await logActivity(supabase, {
    organizationId: organization.id,
    actorId: userId,
    entityType: "wiki_doc",
    entityId: copy.id,
    action: "wiki.created",
    metadata: { title, slug: copy.slug },
  });

  wikiPaths(copy.slug);
  return { ok: true, slug: copy.slug };
}
