import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, Project, ProjectMember } from "@/types/database";

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
