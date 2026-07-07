"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { UserPlus, X } from "lucide-react";
import {
  addTaskAssignee,
  removeTaskAssignee,
} from "@/app/(app)/projects/[slug]/tasks/actions";
import { displayName } from "@/lib/display-name";
import type { Profile } from "@/types/database";

export function TaskAssigneesPicker({
  taskId,
  projectId,
  projectSlug,
  taskTitle,
  members,
  assignees,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  taskTitle: string;
  members: Profile[];
  assignees: Profile[];
}) {
  const [, startTransition] = useTransition();
  const [optimisticAssignees, setOptimisticAssignees] = useOptimistic(assignees);
  const assignedIds = new Set(optimisticAssignees.map((a) => a.id));

  function toggle(member: Profile, isAssigned: boolean) {
    startTransition(async () => {
      setOptimisticAssignees(
        isAssigned
          ? optimisticAssignees.filter((a) => a.id !== member.id)
          : [...optimisticAssignees, member]
      );
      if (isAssigned) {
        await removeTaskAssignee(taskId, projectSlug, member.id);
      } else {
        await addTaskAssignee(taskId, projectId, projectSlug, taskTitle, member.id);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {optimisticAssignees.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {optimisticAssignees.map((member) => (
            <span
              key={member.id}
              className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pl-0.5 pr-2 text-xs"
            >
              <UserAvatar
                name={member.full_name}
                email={member.email}
                avatarUrl={member.avatar_url}
                className="h-5 w-5"
              />
              {displayName(member)}
              <button
                type="button"
                onClick={() => toggle(member, true)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Unassign ${displayName(member)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="w-fit" />}>
          <UserPlus className="h-3.5 w-3.5" />
          {optimisticAssignees.length > 0 ? "Add assignee" : "Assign"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {members.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            members.map((member) => {
              const isAssigned = assignedIds.has(member.id);
              return (
                <DropdownMenuCheckboxItem
                  key={member.id}
                  checked={isAssigned}
                  onCheckedChange={() => toggle(member, isAssigned)}
                  onSelect={(e) => e.preventDefault()}
                >
                  <UserAvatar
                    name={member.full_name}
                    email={member.email}
                    avatarUrl={member.avatar_url}
                    className="h-5 w-5"
                  />
                  {displayName(member)}
                </DropdownMenuCheckboxItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
