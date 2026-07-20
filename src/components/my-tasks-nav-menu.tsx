"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ListChecks, CalendarDays } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// "My Tasks" nav entry with a small dropdown: the tasks list itself plus the
// contribution-style Activity Calendar.
export function MyTasksNavMenu() {
  const pathname = usePathname();
  const active = pathname.startsWith("/my-tasks") || pathname.startsWith("/activity-calendar");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors outline-none",
          active
            ? "bg-accent text-primary"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        )}
      >
        My Tasks
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem render={<Link href="/my-tasks" />}>
          <ListChecks className="h-4 w-4" />
          My Tasks
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/activity-calendar" />}>
          <CalendarDays className="h-4 w-4" />
          Activity Calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
