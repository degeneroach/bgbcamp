"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProjectEmbeds } from "@/lib/project-embeds";
import { cn } from "@/lib/utils";

export function ProjectTabs({
  slug,
  action,
}: {
  slug: string;
  /** Right-aligned control on the tabs row, shown only on the board page. */
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = `/projects/${slug}`;

  interface Tab {
    href: string;
    label: string;
    exact?: boolean;
    alsoMatch?: string;
  }

  const tabs: Tab[] = [
    // Task detail pages live under /tasks/, so they count as the Tasks tab.
    { href: base, label: "Tasks", exact: true, alsoMatch: `${base}/tasks` },
    { href: `${base}/activity`, label: "Activity" },
    ...getProjectEmbeds(slug).map((embed) => ({
      href: `${base}/embed/${embed.id}`,
      label: embed.label,
    })),
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <div className="flex items-center gap-1 border-b">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href || (tab.alsoMatch ? pathname.startsWith(tab.alsoMatch) : false)
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
      {action && pathname === base && <div className="ml-auto pb-1.5">{action}</div>}
    </div>
  );
}
