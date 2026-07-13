import Link from "next/link";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getProjectMembers } from "@/lib/projects";
import { activitySummary } from "@/lib/activity-summary";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationToggle } from "@/components/notification-toggle";
import { ProjectSettingsMenu } from "@/components/project-settings-menu";
import { ProjectTabs } from "@/components/project-tabs";
import { RichTextContent } from "@/components/rich-text-editor";
import type { ActivityEvent, Profile } from "@/types/database";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const project = await getProjectBySlug(supabase, organization.id, slug);
  const members = await getProjectMembers(supabase, project.id);

  const currentMembership = members.find((m) => m.user_id === userId);

  const { data: recentEvents } = await supabase
    .from("activity_events")
    .select("*, actor:profiles!actor_id(full_name, email, avatar_url)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const typedEvents = (recentEvents ?? []) as (ActivityEvent & {
    actor: Pick<Profile, "full_name" | "email" | "avatar_url"> | null;
  })[];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold text-white"
              style={{ backgroundColor: project.color }}
            >
              {project.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="flex flex-col gap-1">
              <Link href={`/projects/${slug}`} className="w-fit">
                <h1 className="text-2xl font-semibold tracking-tight hover:underline">
                  {project.name}
                </h1>
              </Link>
              {project.description && (
                <RichTextContent
                  html={project.description}
                  className="text-sm text-muted-foreground [&_img]:max-w-xs"
                />
              )}
              {typedEvents.length > 0 && (
                <div className="mt-1 flex flex-col gap-1">
                  {typedEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/projects/${slug}/activity`}
                      className="group flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <UserAvatar
                        name={event.actor?.full_name}
                        email={event.actor?.email ?? ""}
                        avatarUrl={event.actor?.avatar_url}
                        className="h-4 w-4 text-[8px]"
                      />
                      <span className="truncate group-hover:underline">
                        {displayName(event.actor)} {activitySummary(event)}
                      </span>
                      <span className="shrink-0 text-muted-foreground/60">
                        {timeAgo(event.created_at)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {members.slice(0, 6).map((m) => (
                <UserAvatar
                  key={m.id}
                  name={m.profiles.full_name}
                  email={m.profiles.email}
                  avatarUrl={m.profiles.avatar_url}
                  className="h-7 w-7 border-2 border-background"
                />
              ))}
            </div>
            <NotificationToggle
              projectId={project.id}
              projectSlug={slug}
              initialEnabled={currentMembership?.notifications_enabled ?? true}
            />
            <ProjectSettingsMenu projectId={project.id} projectSlug={slug} />
          </div>
        </div>
        <ProjectTabs slug={slug} />
      </div>
      {children}
    </div>
  );
}
