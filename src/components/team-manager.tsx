"use client";

import { useState, useTransition } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { updateMemberRole, removeMember } from "@/app/(app)/people/actions";
import { displayName } from "@/lib/display-name";
import { timeAgo } from "@/lib/format";
import type { Profile, Role } from "@/types/database";

export interface TeamMember {
  role: Role;
  profile: Profile;
}

const ROLE_ITEMS: Record<string, React.ReactNode> = {
  admin: "Admin",
  member: "Member",
};

// Only rendered inside the admin-only People card — members never see this.
function LastSeen({ lastSeenAt }: { lastSeenAt: string | null }) {
  if (!lastSeenAt) {
    return (
      <span className="text-[11px] italic text-muted-foreground/70">Hasn&apos;t signed in yet</span>
    );
  }
  const activeNow = Date.now() - Date.parse(lastSeenAt) < 15 * 60 * 1000;
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
      <span
        className={`h-1.5 w-1.5 rounded-full ${activeNow ? "bg-success" : "bg-muted-foreground/40"}`}
        aria-hidden
      />
      {activeNow ? "Active now" : `Last seen ${timeAgo(lastSeenAt)}`}
    </span>
  );
}

export function TeamManager({
  members,
  currentUserId,
  currentRole,
}: {
  members: TeamMember[];
  currentUserId: string;
  currentRole: Role;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function changeRole(userId: string, role: "admin" | "member") {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRole(userId, role);
      if (!result.ok) setError(result.error ?? "Could not update role.");
    });
  }

  function remove(member: TeamMember) {
    const name = displayName(member.profile);
    if (!window.confirm(`Remove ${name} from the team? They'll lose access to BGBCamp.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await removeMember(member.profile.id);
      if (!result.ok) setError(result.error ?? "Could not remove member.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col divide-y rounded-md border">
        {members.map((member) => {
          const isSelf = member.profile.id === currentUserId;
          // Owners manage everyone else; admins manage plain members only.
          const canManage =
            !isSelf &&
            member.role !== "owner" &&
            (currentRole === "owner" || member.role === "member");
          return (
            <div key={member.profile.id} className="flex items-center gap-3 px-3 py-2.5">
              <UserAvatar
                name={member.profile.full_name}
                email={member.profile.email}
                avatarUrl={member.profile.avatar_url}
                className="h-8 w-8"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {displayName(member.profile)}
                  {isSelf && <span className="text-muted-foreground"> (you)</span>}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {member.profile.email}
                </span>
                {!isSelf && <LastSeen lastSeenAt={member.profile.last_seen_at} />}
              </div>
              {canManage ? (
                <>
                  <Select
                    items={ROLE_ITEMS}
                    value={member.role}
                    onValueChange={(v) => changeRole(member.profile.id, v as "admin" | "member")}
                  >
                    <SelectTrigger className="h-7 w-[110px] text-xs" disabled={isPending}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => remove(member)}
                    disabled={isPending}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                    aria-label={`Remove ${displayName(member.profile)}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <Badge variant="secondary" className="capitalize">
                  {member.role}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div>
        <InviteMemberDialog />
      </div>
    </div>
  );
}
