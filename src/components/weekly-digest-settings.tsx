"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/user-avatar";
import { setWeeklyDigest } from "@/app/(app)/people/actions";
import { displayName } from "@/lib/display-name";
import { toast } from "sonner";
import type { Profile } from "@/types/database";

// Admin-only: who receives the Monday 9am email listing their open tasks.
export function WeeklyDigestSettings({ members }: { members: Profile[] }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((m) => [m.id, m.weekly_digest]))
  );
  const [, startTransition] = useTransition();

  function toggle(member: Profile, value: boolean) {
    setEnabled((prev) => ({ ...prev, [member.id]: value }));
    startTransition(async () => {
      const result = await setWeeklyDigest(member.id, value);
      if (!result.ok) {
        setEnabled((prev) => ({ ...prev, [member.id]: !value }));
        toast.error(result.error ?? "Couldn't save.");
        return;
      }
      toast.success(
        value
          ? `${displayName(member)} will get the Monday email.`
          : `${displayName(member)} won't get the Monday email.`,
        { id: `digest-${member.id}` }
      );
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((member) => (
        <label key={member.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            checked={enabled[member.id] ?? false}
            onCheckedChange={(checked) => toggle(member, checked === true)}
          />
          <UserAvatar
            name={member.full_name}
            email={member.email}
            avatarUrl={member.avatar_url}
            className="h-5 w-5 text-[8px]"
          />
          <span>{displayName(member)}</span>
          <span className="text-xs text-muted-foreground">{member.email}</span>
        </label>
      ))}
    </div>
  );
}
