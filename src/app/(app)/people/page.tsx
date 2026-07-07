import Link from "next/link";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/user-avatar";
import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { displayName } from "@/lib/display-name";
import { startOfDay } from "date-fns";
import type { Profile, Role } from "@/types/database";

export default async function PeoplePage() {
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("organization_members")
    .select("role, profiles(*)")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true });

  const { data: assignments } = await supabase
    .from("task_assignees")
    .select("user_id, tasks!inner(completed_at, due_date, projects!inner(organization_id))")
    .eq("tasks.projects.organization_id", organization.id);

  const today = startOfDay(new Date()).toISOString().slice(0, 10);
  const openByUser = new Map<string, number>();
  const overdueByUser = new Map<string, number>();

  for (const assignment of (assignments ?? []) as unknown as {
    user_id: string;
    tasks: { completed_at: string | null; due_date: string | null };
  }[]) {
    if (!assignment.tasks.completed_at) {
      openByUser.set(assignment.user_id, (openByUser.get(assignment.user_id) ?? 0) + 1);
      if (assignment.tasks.due_date && assignment.tasks.due_date < today) {
        overdueByUser.set(assignment.user_id, (overdueByUser.get(assignment.user_id) ?? 0) + 1);
      }
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organization.name}&apos;s team and what they&apos;re working on.
          </p>
        </div>
        <InviteMemberDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(members ?? []).map((member) => {
          const profile = member.profiles as unknown as Profile;
          const open = openByUser.get(profile.id) ?? 0;
          const overdue = overdueByUser.get(profile.id) ?? 0;
          return (
            <Link key={profile.id} href={`/people/${profile.id}`}>
              <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
                <UserAvatar
                  name={profile.full_name}
                  email={profile.email}
                  avatarUrl={profile.avatar_url}
                  className="h-10 w-10"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{displayName(profile)}</span>
                  <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {member.role as Role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{open} open</span>
                    {overdue > 0 && (
                      <span className="text-xs font-medium text-warning">{overdue} overdue</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
