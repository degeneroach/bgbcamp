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
