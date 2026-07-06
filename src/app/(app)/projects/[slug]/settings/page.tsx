import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getProjectMembers } from "@/lib/projects";
import { ProjectSettingsForm } from "@/components/project-settings-form";
import { ProjectMembersManager } from "@/components/project-members-manager";
import { Card } from "@/components/ui/card";
import type { Profile } from "@/types/database";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const project = await getProjectBySlug(supabase, organization.id, slug);
  const members = await getProjectMembers(supabase, project.id);

  const { data: orgMembers } = await supabase
    .from("organization_members")
    .select("profiles(*)")
    .eq("organization_id", organization.id);

  const currentMemberIds = new Set(members.map((m) => m.user_id));
  const availableMembers = (orgMembers ?? [])
    .map((m) => m.profiles as unknown as Profile)
    .filter((p) => !currentMemberIds.has(p.id));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-4">
        <h2 className="font-medium">Project details</h2>
        <ProjectSettingsForm project={project} />
      </Card>

      <Card className="flex flex-col gap-4 p-4">
        <h2 className="font-medium">Members</h2>
        <ProjectMembersManager
          projectId={project.id}
          projectSlug={slug}
          currentMembers={members.map((m) => m.profiles)}
          availableMembers={availableMembers}
        />
      </Card>
    </div>
  );
}
