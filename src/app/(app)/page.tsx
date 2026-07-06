import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard, type ProjectCardActivity } from "@/components/project-card";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { activitySummary } from "@/lib/activity-summary";
import type { ActivityEvent, Profile, Project } from "@/types/database";

export default async function DashboardPage() {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const [{ data: projects }, { data: favorites }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase.from("project_favorites").select("project_id").eq("user_id", userId),
  ]);

  const projectList = (projects ?? []) as Project[];
  const projectIds = projectList.map((p) => p.id);
  const favoriteIds = new Set((favorites ?? []).map((f) => f.project_id));

  const [{ data: memberRows }, { data: recentEvents }] = await Promise.all([
    projectIds.length
      ? supabase
          .from("project_members")
          .select("project_id, profiles(*)")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] as { project_id: string; profiles: Profile | null }[] }),
    projectIds.length
      ? supabase
          .from("activity_events")
          .select("*, actor:profiles!actor_id(full_name, email)")
          .eq("organization_id", organization.id)
          .not("project_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(150)
      : Promise.resolve({ data: [] as (ActivityEvent & { actor: Pick<Profile, "full_name" | "email"> | null })[] }),
  ]);

  const membersByProject = new Map<string, Profile[]>();
  for (const row of (memberRows ?? []) as { project_id: string; profiles: Profile | null }[]) {
    if (!row.profiles) continue;
    const list = membersByProject.get(row.project_id) ?? [];
    list.push(row.profiles);
    membersByProject.set(row.project_id, list);
  }

  const latestActivityByProject = new Map<string, ProjectCardActivity>();
  for (const event of (recentEvents ?? []) as (ActivityEvent & {
    actor: Pick<Profile, "full_name" | "email"> | null;
  })[]) {
    if (!event.project_id || latestActivityByProject.has(event.project_id)) continue;
    const actorName = event.actor?.full_name || event.actor?.email || "Someone";
    latestActivityByProject.set(event.project_id, {
      summary: `${actorName} ${activitySummary(event)}`,
      createdAt: event.created_at,
    });
  }

  const favoriteProjects = projectList.filter((p) => favoriteIds.has(p.id));
  const otherProjects = projectList.filter((p) => !favoriteIds.has(p.id));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Everything your team is working on, in one place.
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {projectList.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <>
          {favoriteProjects.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">Favorites</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favoriteProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    members={membersByProject.get(project.id) ?? []}
                    isFavorite
                    latestActivity={latestActivityByProject.get(project.id) ?? null}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              {favoriteProjects.length > 0 ? "All Projects" : "Projects"}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  members={membersByProject.get(project.id) ?? []}
                  isFavorite={false}
                  latestActivity={latestActivityByProject.get(project.id) ?? null}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-24 text-center">
      <p className="font-medium">No projects yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Create your first project to start posting updates, assigning tasks, and tracking
        progress with your team.
      </p>
    </div>
  );
}
