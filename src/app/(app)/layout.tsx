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
  const { notifications, unreadCount, unreadBoostCount } = await getRecentNotifications(
    supabase,
    userId
  );

  return (
    <AppShell
      profile={profile}
      organization={organization}
      notifications={notifications}
      unreadCount={unreadCount}
      unreadBoostCount={unreadBoostCount}
    >
      {children}
    </AppShell>
  );
}
