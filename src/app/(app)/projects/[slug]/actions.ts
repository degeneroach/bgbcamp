"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { logActivity } from "@/lib/activity";
import { sanitizeHtml } from "@/lib/sanitize";
import { htmlToExcerpt } from "@/lib/mentions";

export async function toggleProjectNotifications(
  projectId: string,
  projectSlug: string,
  enabled: boolean
) {
  const { userId } = await requireCurrentUser();
  const supabase = await createClient();

  await supabase
    .from("project_members")
    .upsert(
      { project_id: projectId, user_id: userId, notifications_enabled: enabled },
      { onConflict: "project_id,user_id" }
    );

  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath(`/projects/${projectSlug}/board`);
}

export async function addProjectMember(
  projectId: string,
  projectSlug: string,
  userId: string
) {
  const supabase = await createClient();
  await supabase
    .from("project_members")
    .upsert(
      { project_id: projectId, user_id: userId, role: "member" },
      { onConflict: "project_id,user_id" }
    );
  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath(`/projects/${projectSlug}/board`);
  revalidatePath(`/projects/${projectSlug}/settings`);
}

export async function removeProjectMember(
  projectId: string,
  projectSlug: string,
  userId: string
) {
  const supabase = await createClient();
  await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath(`/projects/${projectSlug}/board`);
  revalidatePath(`/projects/${projectSlug}/settings`);
}

export interface UpdateProjectResult {
  ok: boolean;
  error?: string;
}

export async function updateProjectSettings(
  projectId: string,
  projectSlug: string,
  formData: FormData
): Promise<UpdateProjectResult> {
  const name = String(formData.get("name") ?? "").trim();
  const descriptionHtml = sanitizeHtml(String(formData.get("description") ?? ""));

  if (name.length < 2) {
    return { ok: false, error: "Give the project a name." };
  }

  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  const { error } = await supabase
    .from("projects")
    .update({ name, description: htmlToExcerpt(descriptionHtml) ? descriptionHtml : null })
    .eq("id", projectId);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (existing && existing.name !== name) {
    await logActivity(supabase, {
      organizationId: organization.id,
      projectId,
      actorId: userId,
      entityType: "project",
      entityId: projectId,
      action: "project.renamed",
      metadata: { previousName: existing.name, name },
    });
  }

  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath(`/projects/${projectSlug}/board`);
  revalidatePath(`/projects/${projectSlug}/settings`);
  revalidatePath("/");
  return { ok: true };
}

export async function archiveProject(projectId: string) {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  await supabase.from("projects").update({ archived: true }).eq("id", projectId);

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId,
    actorId: userId,
    entityType: "project",
    entityId: projectId,
    action: "project.archived",
    metadata: { name: project?.name ?? "" },
  });

  revalidatePath("/");
  redirect("/");
}

export async function restoreProject(projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ archived: false }).eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function updateProjectLogo(
  projectId: string,
  projectSlug: string,
  logoUrl: string | null
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("projects")
    .update({ logo_url: logoUrl })
    .eq("id", projectId);

  if (error) return { ok: false, error: error.message };

  // Logo shows in the project header, dashboard cards, and favorites bar.
  revalidatePath("/", "layout");
  revalidatePath(`/projects/${projectSlug}`);
  return { ok: true };
}
