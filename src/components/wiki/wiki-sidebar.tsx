"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { NewDocButton } from "@/components/wiki/new-doc-button";
import { Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WikiSectionWithDocs } from "@/lib/wiki";

interface BusinessGroup {
  business: string;
  sections: WikiSectionWithDocs[];
}

export function WikiSidebar({ sections }: { sections: WikiSectionWithDocs[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  // Group sections by business, preserving sort order.
  const groups = useMemo(() => {
    const map = new Map<string, WikiSectionWithDocs[]>();
    for (const section of sections) {
      const key = section.business || "General";
      const list = map.get(key) ?? [];
      list.push(section);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([business, secs]): BusinessGroup => ({
      business,
      sections: secs,
    }));
  }, [sections]);

  // The business containing the active doc starts expanded.
  const activeBusiness = useMemo(() => {
    const slug = pathname.match(/^\/tools\/wiki\/([^/]+)/)?.[1];
    if (!slug) return null;
    for (const group of groups) {
      if (group.sections.some((s) => s.docs.some((d) => d.slug === slug))) {
        return group.business;
      }
    }
    return null;
  }, [pathname, groups]);

  const [openBusinesses, setOpenBusinesses] = useState<Record<string, boolean>>(() => ({
    [activeBusiness ?? groups[0]?.business ?? ""]: true,
  }));

  function toggleBusiness(business: string) {
    setOpenBusinesses((prev) => ({ ...prev, [business]: !prev[business] }));
  }

  const q = query.trim().toLowerCase();

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

      <nav className="flex flex-col gap-1.5 overflow-y-auto">
        {groups.map((group) => {
          // While searching, force groups open and hide non-matching docs.
          const filteredSections = group.sections.map((section) => ({
            ...section,
            docs: q
              ? section.docs.filter((d) => d.title.toLowerCase().includes(q))
              : section.docs,
          }));
          const matchCount = filteredSections.reduce((sum, s) => sum + s.docs.length, 0);
          if (q && matchCount === 0) return null;
          const open = q ? true : (openBusinesses[group.business] ?? false);

          return (
            <div key={group.business} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleBusiness(group.business)}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-2 text-left text-sm font-semibold hover:bg-muted/60"
                aria-expanded={open}
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                    open && "rotate-90"
                  )}
                />
                <span className="min-w-0 flex-1 leading-snug">{group.business}</span>
                <span className="shrink-0 text-xs font-normal text-muted-foreground">
                  {group.sections.reduce((sum, s) => sum + s.docs.length, 0)}
                </span>
              </button>

              {open && (
                <div className="mb-1.5 ml-2 flex flex-col gap-3 border-l border-border/60 pb-1 pl-2 pt-1">
                  {filteredSections.map((section) => (
                    <div key={section.id} className="flex flex-col gap-0.5">
                      <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {section.name}
                      </span>
                      {section.docs.length === 0 ? (
                        <span className="px-2 py-0.5 text-xs italic text-muted-foreground/60">
                          No docs yet
                        </span>
                      ) : (
                        section.docs.map((doc) => {
                          const href = `/tools/wiki/${doc.slug}`;
                          const active =
                            pathname === href || pathname.startsWith(`${href}/`);
                          return (
                            <Link
                              key={doc.id}
                              href={href}
                              className={cn(
                                "flex items-start gap-2 rounded-md py-1.5 pl-2 pr-1.5 text-[13px] leading-snug transition-colors",
                                active
                                  ? "bg-accent font-medium text-primary"
                                  : "text-foreground/85 hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <span className="min-w-0 flex-1 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                                {doc.title}
                              </span>
                              {!doc.is_published && (
                                <span className="mt-0.5 shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                                  Draft
                                </span>
                              )}
                            </Link>
                          );
                        })
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
