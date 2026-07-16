import Link from "next/link";
import { Star } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsBell, BoostsBell } from "@/components/notifications-bell";
import { OrganizationNameEditor } from "@/components/organization-name-editor";
import { BrandMark } from "@/components/brand-mark";
import { ImageLightboxProvider } from "@/components/image-lightbox";
import type { Profile, Organization } from "@/types/database";
import type { NotificationWithRelations } from "@/lib/notifications";

export interface FavoriteProject {
  id: string;
  name: string;
  slug: string;
  color: string;
  logo_url: string | null;
}

export function AppShell({
  profile,
  organization,
  notifications,
  unreadCount,
  unreadBoostCount,
  favoriteProjects,
  children,
}: {
  profile: Profile;
  organization: Organization;
  notifications: NotificationWithRelations[];
  unreadCount: number;
  unreadBoostCount: number;
  favoriteProjects: FavoriteProject[];
  children: React.ReactNode;
}) {
  const boostNotifications = notifications.filter((n) => n.entity_type === "boost");
  const mentionNotifications = notifications.filter((n) => n.entity_type !== "boost");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Soft sage tint (pulled from the brand green) sets the header apart
          from the page background. */}
      <header className="sticky top-0 z-40 border-b border-[#33402a]/10 bg-[#eef1e9]/95 backdrop-blur dark:border-white/10 dark:bg-[#0d1320]/95">
        <div className="mx-auto flex h-12 w-full max-w-[1150px] items-center gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2">
              <BrandMark className="h-7 w-7" />
              <span className="text-sm font-semibold tracking-tight">BGBCamp</span>
            </Link>
            <span className="hidden h-4 w-px bg-border lg:block" aria-hidden />
            <div className="hidden w-40 lg:block">
              <OrganizationNameEditor name={organization.name} />
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/" exact>
              Dashboard
            </NavLink>
            <NavLink href="/activity">Activity</NavLink>
            <NavLink href="/people">People</NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <GlobalSearch />
            </div>
            <BoostsBell notifications={boostNotifications} unreadCount={unreadBoostCount} />
            <NotificationsBell notifications={mentionNotifications} unreadCount={unreadCount} />
            <UserMenu
              name={profile.full_name}
              email={profile.email}
              avatarUrl={profile.avatar_url}
            />
          </div>
        </div>

        <nav className="mx-auto flex w-full max-w-[1150px] items-center gap-1 px-4 pb-2 md:hidden">
          <NavLink href="/" exact>
            Dashboard
          </NavLink>
          <NavLink href="/activity">Activity</NavLink>
          <NavLink href="/people">People</NavLink>
          <NavLink href="/search">Search</NavLink>
        </nav>

        {favoriteProjects.length > 0 && (
          <div className="border-t border-[#33402a]/10 bg-[#e6ebe0]/70 dark:border-white/10 dark:bg-[#0a101b]/80">
            <div className="mx-auto flex h-8 w-full max-w-[1150px] items-center gap-1 overflow-x-auto px-4 md:px-6">
              <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
              {favoriteProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-foreground/80 hover:bg-[#33402a]/10 hover:text-foreground dark:hover:bg-white/10"
                >
                  {project.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.logo_url}
                      alt=""
                      className="h-5 w-5 rounded-[5px] object-cover"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                      aria-hidden
                    />
                  )}
                  {project.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1150px] flex-1 px-4 py-8 md:px-6 md:py-10">
        <ImageLightboxProvider>{children}</ImageLightboxProvider>
      </main>
    </div>
  );
}
