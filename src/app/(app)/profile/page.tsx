import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ProfileNameForm } from "@/components/profile-name-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { PushNotificationsToggle } from "@/components/push-notifications-toggle";
import { TeamManager, type TeamMember } from "@/components/team-manager";
import { Card } from "@/components/ui/card";
import type { Profile, Role } from "@/types/database";

export default async function ProfilePage() {
  const { userId, profile, organization, role } = await requireCurrentUser();
  const isAdmin = role === "owner" || role === "admin";

  let teamMembers: TeamMember[] = [];
  if (isAdmin) {
    const supabase = await createClient();
    const { data: memberRows } = await supabase
      .from("organization_members")
      .select("role, profiles(*)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true });
    teamMembers = (memberRows ?? [])
      .map((row) => ({
        role: row.role as Role,
        profile: row.profiles as unknown as Profile | null,
      }))
      .filter((m): m is TeamMember => m.profile !== null);
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
