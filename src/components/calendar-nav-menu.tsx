"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, CalendarDays, CalendarRange, Activity } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// "Calendar" nav entry: the due-date calendar plus the activity views.
export function CalendarNavMenu() {
  const pathname = usePathname();
  const active =
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/activity-calendar") ||
    pathname.startsWith("/activity");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors outline-none",
          active
            ? "bg-accent text-primary"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        )}
      >
        Calendar
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem render={<Link href="/calendar" />}>
          <CalendarDays className="h-4 w-4" />
          Calendar
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/activity" />}>
          <Activity className="h-4 w-4" />
          Activity Timeline
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/activity-calendar" />}>
          <CalendarRange className="h-4 w-4" />
          Activity Calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
