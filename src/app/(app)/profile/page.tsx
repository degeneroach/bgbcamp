import { requireCurrentUser } from "@/lib/current-user";
import { AvatarUploader } from "@/components/avatar-uploader";
import { ProfileNameForm } from "@/components/profile-name-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";

export default async function ProfilePage() {
  const { userId, profile } = await requireCurrentUser();

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
      </Card>
    </div>
  );
}
