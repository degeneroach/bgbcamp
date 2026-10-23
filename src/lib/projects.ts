import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentUser } from "@/lib/current-user";
import type { Database, Profile, Project, ProjectMember, Role } from "@/types/database";

// Access rule: owners/admins see every project; members only see projects
// they're listed on (Settings → Members). Returns null for "all projects".
export async function accessibleProjectIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  role: Role
): Promise<Set<string> | null> {
  if (role === "owner" || role === "admin") return null;
  const { data } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.project_id));
}

// Org-wide items (e.g. message board events) have no project and are
// visible to everyone.
export function canAccessProject(
  ids: Set<string> | null,
  projectId: string | null
): boolean {
  return ids === null || projectId === null || ids.has(projectId);
}

export async function getProjectBySlug(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  slug: string
): Promise<Project> {
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  // Every /projects/[slug]/* route resolves its project here, so this one
  // check gates direct links to boards, tasks, settings, and activity.
  const { userId, role } = await requireCurrentUser();
  const ids = await accessibleProjectIds(supabase, userId, role);
  if (!canAccessProject(ids, project.id)) {
    notFound();
  }

  return project;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  profiles: Profile;
}

export async function getProjectMembers(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<ProjectMemberWithProfile[]> {
  const { data } = await supabase
    .from("project_members")
    .select("*, profiles(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  return (data ?? []) as unknown as ProjectMemberWithProfile[];
}

// Everyone in the organization. This is the pool used for @mentions, task
// assignees, and people filters — for a small internal team, anyone in the
// org should be taggable/assignable on any project without first being added
// to that project's member list.
export async function getOrganizationMembers(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<Profile[]> {
  const { data } = await supabase
    .from("organization_members")
    .select("profiles(*)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  return (data ?? [])
    .map((row) => (row as unknown as { profiles: Profile | null }).profiles)
    .filter((p): p is Profile => p !== null);
}
