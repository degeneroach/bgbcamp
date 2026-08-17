"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Wrench, Calculator, NotebookText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// "Tools" nav entry: a dropdown of internal utilities. First tool: the
// Amazon Margins calculator.
export function ToolsNavMenu() {
  const pathname = usePathname();
  const active = pathname.startsWith("/tools");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors outline-none",
          active
            ? "bg-accent text-primary"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        )}
      >
        <Wrench className="h-4 w-4" />
        Tools
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-aria-expanded:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem render={<Link href="/tools/amazon-margins" />} className="h-10 gap-2.5">
          <Calculator className="h-4 w-4" />
          Amazon Margins
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/tools/wiki" />} className="h-10 gap-2.5">
          <NotebookText className="h-4 w-4" />
          SOP Wiki
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
