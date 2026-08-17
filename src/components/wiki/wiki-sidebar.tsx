"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { NewDocButton } from "@/components/wiki/new-doc-button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WikiSectionWithDocs } from "@/lib/wiki";

export function WikiSidebar({ sections }: { sections: WikiSectionWithDocs[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = sections.map((section) => ({
    ...section,
    docs: q ? section.docs.filter((d) => d.title.toLowerCase().includes(q)) : section.docs,
  }));

  return (
    <aside className="flex flex-col gap-3 rounded-xl border bg-card p-3 lg:min-h-[70vh] lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">SOP Wiki</h2>
        <NewDocButton />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs..."
          className="h-8 pl-8"
        />
      </div>

      <nav className="flex flex-col gap-4 overflow-y-auto">
        {filtered.map((section) => (
          <div key={section.id} className="flex flex-col gap-1">
            <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {section.name}
            </span>
            {section.docs.length === 0 ? (
              <span className="px-3 py-1 text-xs italic text-muted-foreground/70">
                No docs yet
              </span>
            ) : (
              section.docs.map((doc) => {
                const href = `/tools/wiki/${doc.slug}`;
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={doc.id}
                    href={href}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-md pl-3 pr-2 text-sm transition-colors",
                      active
                        ? "bg-accent font-medium text-primary"
                        : "text-foreground/85 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                    {!doc.is_published && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                        Draft
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
