"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { X } from "lucide-react";
import {
  addProjectMember,
  removeProjectMember,
} from "@/app/(app)/projects/[slug]/actions";
import type { Profile } from "@/types/database";

export function ProjectMembersManager({
  projectId,
  projectSlug,
  currentMembers,
  availableMembers,
}: {
  projectId: string;
  projectSlug: string;
  currentMembers: Profile[];
  availableMembers: Profile[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {currentMembers.map((member) => (
          <div key={member.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <UserAvatar name={member.full_name} email={member.email} avatarUrl={member.avatar_url} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{member.full_name || member.email}</span>
              <span className="truncate text-xs text-muted-foreground">{member.email}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={isPending}
              onClick={() => {
                startTransition(() => {
                  removeProjectMember(projectId, projectSlug, member.id);
                });
              }}
              aria-label={`Remove ${member.full_name || member.email}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {availableMembers.length > 0 && (
        <Select
          value=""
          onValueChange={(userId) => {
            if (!userId) return;
            startTransition(() => {
              addProjectMember(projectId, projectSlug, userId);
            });
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-64">
            <SelectValue placeholder="Add a team member..." />
          </SelectTrigger>
          <SelectContent>
            {availableMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <UserAvatar name={member.full_name} email={member.email} avatarUrl={member.avatar_url} className="h-4 w-4" />
                {member.full_name || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
