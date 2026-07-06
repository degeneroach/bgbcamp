"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";

export interface RenameOrgResult {
  ok: boolean;
  error?: string;
}

export async function renameOrganization(name: string): Promise<RenameOrgResult> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Give your organization a name." };
  }

  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("organizations")
    .update({ name: trimmed })
    .eq("id", organization.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
