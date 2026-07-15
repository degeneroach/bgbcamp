import Link from "next/link";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getProjectMembers } from "@/lib/projects";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationToggle } from "@/components/notification-toggle";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { ProjectSettingsMenu } from "@/components/project-settings-menu";
import { ProjectTabs } from "@/components/project-tabs";
import { RichTextContent } from "@/components/rich-text-editor";

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

  const [members, { data: favoriteRow }] = await Promise.all([
    getProjectMembers(supabase, project.id),
    supabase
      .from("project_favorites")
      .select("project_id")
      .eq("user_id", userId)
      .eq("project_id", project.id)
      .maybeSingle(),
  ]);

  const currentMembership = members.find((m) => m.user_id === userId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Link
              href={`/projects/${slug}`}
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold text-white"
              style={{ backgroundColor: project.color }}
            >
              {project.name.slice(0, 1).toUpperCase()}
            </Link>
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
            <FavoriteToggle projectId={project.id} initialFavorited={Boolean(favoriteRow)} />
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
