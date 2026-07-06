import Link from "next/link";
import { LayoutGrid, Activity, Users, Search as SearchIcon } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsBell } from "@/components/notifications-bell";
import { OrganizationNameEditor } from "@/components/organization-name-editor";
import type { Profile, Organization } from "@/types/database";
import type { NotificationWithRelations } from "@/lib/notifications";

export function AppShell({
  profile,
  organization,
  notifications,
  unreadCount,
  children,
}: {
  profile: Profile;
  organization: Organization;
  notifications: NotificationWithRelations[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/20 px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Link href="/">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-sm font-bold text-background">
              B
            </span>
          </Link>
          <div className="flex min-w-0 flex-col leading-none">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              BGBCamp
            </Link>
            <OrganizationNameEditor name={organization.name} />
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink href="/" exact>
            <LayoutGrid className="h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink href="/activity">
            <Activity className="h-4 w-4" />
            Activity
          </NavLink>
          <NavLink href="/people">
            <Users className="h-4 w-4" />
            People
          </NavLink>
          <NavLink href="/search">
            <SearchIcon className="h-4 w-4" />
            Search
          </NavLink>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-sm font-bold text-background">
              B
            </span>
            <span className="text-sm font-semibold tracking-tight">BGBCamp</span>
          </Link>
          <div className="flex flex-1 justify-center md:justify-start">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell notifications={notifications} unreadCount={unreadCount} />
            <UserMenu
              name={profile.full_name}
              email={profile.email}
              avatarUrl={profile.avatar_url}
            />
          </div>
        </header>
        <nav className="flex items-center gap-1 border-b px-4 py-2 md:hidden">
          <NavLink href="/" exact>
            <LayoutGrid className="h-4 w-4" />
          </NavLink>
          <NavLink href="/activity">
            <Activity className="h-4 w-4" />
          </NavLink>
          <NavLink href="/people">
            <Users className="h-4 w-4" />
          </NavLink>
        </nav>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
