import Link from "next/link";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { FavoriteButton } from "@/components/favorite-button";
import { timeAgo } from "@/lib/format";
import { htmlToExcerpt } from "@/lib/mentions";
import type { Profile, Project } from "@/types/database";

export interface ProjectCardActivity {
  summary: string;
  createdAt: string;
}

export function ProjectCard({
  project,
  members,
  isFavorite,
  latestActivity,
}: {
  project: Project;
  members: Profile[];
  isFavorite: boolean;
  latestActivity: ProjectCardActivity | null;
}) {
  return (
    <Card className="group relative flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="absolute right-2 top-2">
        <FavoriteButton projectId={project.id} initialFavorite={isFavorite} />
      </div>
      <Link href={`/projects/${project.slug}`} className="flex flex-1 flex-col gap-3">
        <div className="flex items-start gap-3 pr-8">
          {project.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logo_url}
              alt={`${project.name} logo`}
              className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border object-cover"
            />
          ) : (
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: project.color }}
            >
              {project.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold leading-tight tracking-tight">{project.name}</span>
            {project.description && (
              <span className="truncate text-xs text-muted-foreground">
                {htmlToExcerpt(project.description)}
              </span>
            )}
          </div>
        </div>

        <div className="min-h-8 text-xs text-muted-foreground">
          {latestActivity ? (
            <p className="line-clamp-2">
              {latestActivity.summary}
              <span className="ml-1 text-muted-foreground/70">
                · {timeAgo(latestActivity.createdAt)}
              </span>
            </p>
          ) : (
            <p className="italic text-muted-foreground/70">No activity yet</p>
          )}
        </div>

        <div className="mt-auto flex items-center">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member) => (
              <UserAvatar
                key={member.id}
                name={member.full_name}
                email={member.email}
                avatarUrl={member.avatar_url}
                className="h-6 w-6 border-2 border-background"
              />
            ))}
          </div>
          {members.length > 5 && (
            <span className="ml-2 text-xs text-muted-foreground">
              +{members.length - 5} more
            </span>
          )}
        </div>
      </Link>
    </Card>
  );
}
