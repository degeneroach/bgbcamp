"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/slug";

export interface CreateProjectResult {
  ok: boolean;
  error?: string;
}

const DEFAULT_TASK_LIST_NAME = "Tasks";

export async function createProject(formData: FormData): Promise<CreateProjectResult> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "#6366f1");

  if (name.length < 2) {
    return { ok: false, error: "Give the project a name." };
  }

  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const baseSlug = slugify(name) || "project";
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      organization_id: organization.id,
      name,
      slug,
      description: description || null,
      color,
      created_by: userId,
    })
    .select()
    .single();

  if (error || !project) {
    return { ok: false, error: error?.message ?? "Could not create project." };
  }

  await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: userId,
    role: "owner",
  });

  await supabase
    .from("task_lists")
    .insert({ project_id: project.id, name: DEFAULT_TASK_LIST_NAME, position: 0 });

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId: project.id,
    actorId: userId,
    entityType: "project",
    entityId: project.id,
    action: "project.created",
    metadata: { name: project.name },
  });

  revalidatePath("/");
  redirect(`/projects/${project.slug}`);
}

export async function toggleFavorite(projectId: string, isFavorite: boolean) {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  if (isFavorite) {
    await supabase
      .from("project_favorites")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);
  } else {
    await supabase
      .from("project_favorites")
      .insert({ project_id: projectId, user_id: userId });
  }

  revalidatePath("/");
}

export async function toggleProjectFavorite(projectId: string, favorited: boolean) {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  if (favorited) {
    await supabase
      .from("project_favorites")
      .upsert(
        { user_id: userId, project_id: projectId },
        { onConflict: "user_id,project_id", ignoreDuplicates: true }
      );
  } else {
    await supabase
      .from("project_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("project_id", projectId);
  }

  revalidatePath("/", "layout");
}
