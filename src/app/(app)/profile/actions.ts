"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";

export interface ProfileActionResult {
  ok: boolean;
  error?: string;
}

export async function updateProfileName(fullName: string): Promise<ProfileActionResult> {
  const trimmed = fullName.trim();
  if (trimmed.length < 1) {
    return { ok: false, error: "Name can't be empty." };
  }

  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAvatar(url: string): Promise<ProfileActionResult> {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeAvatar(): Promise<ProfileActionResult> {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
