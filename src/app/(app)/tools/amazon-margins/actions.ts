"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { logActivity } from "@/lib/activity";

interface SaveResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function saveMarginCalc(input: {
  id: string | null;
  name: string;
  sku: string;
  data: Record<string, string>;
}): Promise<SaveResult> {
  if (!input.name.trim()) return { ok: false, error: "Give the product a name." };
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  if (input.id) {
    const { error } = await supabase
      .from("margin_calcs")
      .update({
        name: input.name.trim(),
        sku: input.sku.trim(),
        data: input.data,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("organization_id", organization.id);
    if (error) return { ok: false, error: error.message };
    await logActivity(supabase, {
      organizationId: organization.id,
      actorId: userId,
      entityType: "margin_calc",
      entityId: input.id,
      action: "margin.updated",
      metadata: { name: input.name.trim(), sku: input.sku.trim() },
    });
    revalidatePath("/tools/amazon-margins");
    return { ok: true, id: input.id };
  }

  const { data: created, error } = await supabase
    .from("margin_calcs")
    .insert({
      organization_id: organization.id,
      name: input.name.trim(),
      sku: input.sku.trim(),
      data: input.data,
      updated_by: userId,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? "Could not save." };
  await logActivity(supabase, {
    organizationId: organization.id,
    actorId: userId,
    entityType: "margin_calc",
    entityId: created.id,
    action: "margin.created",
    metadata: { name: input.name.trim(), sku: input.sku.trim() },
  });
  revalidatePath("/tools/amazon-margins");
  return { ok: true, id: created.id };
}

export async function deleteMarginCalc(id: string): Promise<SaveResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("margin_calcs")
    .select("name, sku")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("margin_calcs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(supabase, {
    organizationId: organization.id,
    actorId: userId,
    entityType: "margin_calc",
    entityId: id,
    action: "margin.deleted",
    metadata: { name: existing?.name ?? "", sku: existing?.sku ?? "" },
  });
  revalidatePath("/tools/amazon-margins");
  return { ok: true };
}
