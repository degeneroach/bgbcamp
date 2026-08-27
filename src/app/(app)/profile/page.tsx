import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ProfileNameForm } from "@/components/profile-name-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { PushNotificationsToggle } from "@/components/push-notifications-toggle";
import { TeamManager, type TeamMember } from "@/components/team-manager";
import { OrganizationNameEditor } from "@/components/organization-name-editor";
import { timeAgo } from "@/lib/format";
import { Card } from "@/components/ui/card";
import type { Profile, Role } from "@/types/database";

export default async function ProfilePage() {
  const { userId, profile, organization, role } = await requireCurrentUser();
  const isAdmin = role === "owner" || role === "admin";

  let teamMembers: TeamMember[] = [];
  let portalLastLogin: string | null = null;
  let portalLastOrder: { end_customer: string; created_at: string } | null = null;
  if (isAdmin) {
    const supabase = await createClient();
    const [{ data: memberRows }, { data: statusRow }, { data: lastOrder }] = await Promise.all([
      supabase
        .from("organization_members")
        .select("role, profiles(*)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("golftown_portal_status")
        .select("last_login_at")
        .eq("organization_id", organization.id)
        .maybeSingle(),
      supabase
        .from("golf_town_orders")
        .select("end_customer, created_at")
        .eq("organization_id", organization.id)
        .eq("submitted_by", "golftown")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    teamMembers = (memberRows ?? [])
      .map((row) => ({
        role: row.role as Role,
        profile: row.profiles as unknown as Profile | null,
      }))
      .filter((m): m is TeamMember => m.profile !== null);
    portalLastLogin = statusRow?.last_login_at ?? null;
    portalLastOrder = lastOrder ?? null;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
      </div>

      <Card className="flex flex-col gap-6 p-5">
        <div>
          <h2 className="mb-3 font-medium">Photo</h2>
          <AvatarUploader
            userId={userId}
            name={profile.full_name}
            email={profile.email}
            avatarUrl={profile.avatar_url}
          />
        </div>

        <div>
          <h2 className="mb-3 font-medium">Name</h2>
          <ProfileNameForm initialName={profile.full_name} />
        </div>

        <div>
          <h2 className="mb-1 font-medium">Appearance</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Just for you — everyone picks their own theme.
          </p>
          <ThemeToggle />
        </div>

        <div>
          <h2 className="mb-3 font-medium">Browser notifications</h2>
          <PushNotificationsToggle />
        </div>
      </Card>

      {isAdmin && (
        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="mb-3 font-medium">Organization name</h2>
            {/* Renaming moved here from the header, which now shows the
                rotating daily greeting. */}
            <div className="max-w-xs rounded-md border px-2 py-1.5">
              <OrganizationNameEditor name={organization.name} />
            </div>
          </div>
          <div>
            <h2 className="mb-1 font-medium">Golf Town portal</h2>
            <p className="text-sm text-muted-foreground">
              Last sign-in:{" "}
              <span className="font-medium text-foreground">
                {portalLastLogin ? timeAgo(portalLastLogin) : "never"}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Last order submitted:{" "}
              {portalLastOrder ? (
                <span className="font-medium text-foreground">
                  &ldquo;{portalLastOrder.end_customer}&rdquo; · {timeAgo(portalLastOrder.created_at)}
                </span>
              ) : (
                <span className="font-medium text-foreground">none yet</span>
              )}
            </p>
          </div>
          <div>
            <h2 className="font-medium">People</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage who&apos;s on the team and what they can do.
            </p>
          </div>
          <TeamManager members={teamMembers} currentUserId={userId} currentRole={role} />
        </Card>
      )}
    </div>
  );
}
