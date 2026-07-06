"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export interface CreateOrgResult {
  ok: boolean;
  error?: string;
}

export async function createOrganization(name: string): Promise<CreateOrgResult> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Give your organization a name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const baseSlug = slugify(trimmed) || "org";
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: trimmed, slug, created_by: user.id })
    .select()
    .single();

  if (orgError || !org) {
    return { ok: false, error: orgError?.message ?? "Could not create organization." };
  }

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  redirect("/");
}
