"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import type { Profile } from "@/types/database";

export function TaskFilters({ members }: { members: Profile[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={searchParams.get("assignee") ?? "all"} onValueChange={(v) => setParam("assignee", v)}>
        <SelectTrigger className="h-8 w-[160px]">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Everyone</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <UserAvatar name={m.full_name} email={m.email} avatarUrl={m.avatar_url} className="h-4 w-4" />
              {m.full_name || m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("state") ?? "all"} onValueChange={(v) => setParam("state", v)}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tasks</SelectItem>
          <SelectItem value="open">Open tasks</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={searchParams.get("due") ?? "all"} onValueChange={(v) => setParam("due", v)}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="Due date" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any due date</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="week">Due this week</SelectItem>
          <SelectItem value="none">No due date</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
