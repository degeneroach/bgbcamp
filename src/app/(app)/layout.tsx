import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getRecentNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, profile, organization } = await requireCurrentUser();
  const supabase = await createClient();
  const [{ notifications, unreadCount, unreadBoostCount }, { data: favoriteRows }] =
    await Promise.all([
      getRecentNotifications(supabase, userId),
      supabase
        .from("project_favorites")
        .select("projects!inner(id, name, slug, color, archived)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
    ]);

  const favoriteProjects = (favoriteRows ?? [])
    .map((row) => row.projects as unknown as { id: string; name: string; slug: string; color: string; archived: boolean })
    .filter((p) => !p.archived);

  return (
    <AppShell
      profile={profile}
      organization={organization}
      notifications={notifications}
      unreadCount={unreadCount}
      unreadBoostCount={unreadBoostCount}
      favoriteProjects={favoriteProjects}
    >
      {children}
    </AppShell>
  );
}
