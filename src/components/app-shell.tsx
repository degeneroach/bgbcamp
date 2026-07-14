import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsBell, BoostsBell } from "@/components/notifications-bell";
import { OrganizationNameEditor } from "@/components/organization-name-editor";
import { BrandMark } from "@/components/brand-mark";
import { ImageLightboxProvider } from "@/components/image-lightbox";
import type { Profile, Organization } from "@/types/database";
import type { NotificationWithRelations } from "@/lib/notifications";

export function AppShell({
  profile,
  organization,
  notifications,
  unreadCount,
  unreadBoostCount,
  children,
}: {
  profile: Profile;
  organization: Organization;
  notifications: NotificationWithRelations[];
  unreadCount: number;
  unreadBoostCount: number;
  children: React.ReactNode;
}) {
  const boostNotifications = notifications.filter((n) => n.entity_type === "boost");
  const mentionNotifications = notifications.filter((n) => n.entity_type !== "boost");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1150px] items-center gap-5 px-4 md:px-6">
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
      </header>

      <main className="mx-auto w-full max-w-[1150px] flex-1 px-4 py-8 md:px-6 md:py-10">
        <ImageLightboxProvider>{children}</ImageLightboxProvider>
      </main>
    </div>
  );
}
