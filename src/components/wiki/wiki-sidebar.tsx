"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { NewDocButton } from "@/components/wiki/new-doc-button";
import { Search, ChevronRight, ExternalLink, CopyPlus, Pencil, Trash2 } from "lucide-react";
import {
  updateWikiDoc,
  deleteWikiDoc,
  duplicateWikiDoc,
} from "@/app/(app)/tools/wiki/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WikiSectionWithDocs, WikiDocListItem } from "@/lib/wiki";

interface BusinessGroup {
  business: string;
  sections: WikiSectionWithDocs[];
}

interface ContextMenuState {
  x: number;
  y: number;
  doc: WikiDocListItem;
}

const DRAG_TYPE = "application/x-bgb-wiki-doc";

export function WikiSidebar({ sections }: { sections: WikiSectionWithDocs[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [, startTransition] = useTransition();

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

  // Close the context menu on any click, scroll, or Escape.
  useEffect(() => {
    if (!menu) return;
    function close() {
      setMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function moveDoc(docId: string, sectionId: string, docSlug: string) {
    startTransition(async () => {
      const result = await updateWikiDoc(docId, { sectionId });
      if (!result.ok) {
        toast.error(result.error ?? "Could not move the doc.");
        return;
      }
      toast.success("Moved.");
      // Keep viewing the doc if it's the active one.
      if (pathname.startsWith(`/tools/wiki/${docSlug}`)) router.refresh();
    });
  }

  function handleDrop(e: React.DragEvent, sectionId: string) {
    e.preventDefault();
    setDropTarget(null);
    setIsDragging(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as {
        docId: string;
        docSlug: string;
        sectionName: string;
      };
      if (payload.docId) moveDoc(payload.docId, sectionId, payload.docSlug);
    } catch {
      /* not our drag */
    }
  }

  // Dropping on a business header lands in that business's same-named
  // category (e.g. Onboarding → Onboarding), falling back to its first.
  function handleBusinessDrop(e: React.DragEvent, group: BusinessGroup) {
    e.preventDefault();
    setDropTarget(null);
    setIsDragging(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as {
        docId: string;
        docSlug: string;
        sectionName: string;
      };
      const target =
        group.sections.find((s) => s.name === payload.sectionName) ?? group.sections[0];
      if (payload.docId && target) moveDoc(payload.docId, target.id, payload.docSlug);
    } catch {
      /* not our drag */
    }
  }

  function menuAction(fn: () => void) {
    setMenu(null);
    fn();
  }

  const q = query.trim().toLowerCase();

  return (
    <aside className="flex flex-col gap-3 rounded-xl border bg-card p-3 print:hidden lg:min-h-[70vh] lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r">
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
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                  e.preventDefault();
                  setDropTarget(`business:${group.business}`);
                  if (!open) toggleBusiness(group.business);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => handleBusinessDrop(e, group)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-2 text-left text-sm font-semibold hover:bg-muted/60",
                  dropTarget === `business:${group.business}` && "bg-accent ring-1 ring-primary/50"
                )}
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
                    <div
                      key={section.id}
                      onDragOver={(e) => {
                        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                        e.preventDefault();
                        setDropTarget(section.id);
                      }}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(e) => handleDrop(e, section.id)}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-md",
                        dropTarget === section.id && "bg-accent/60 ring-1 ring-primary/50",
                        isDragging && "min-h-8"
                      )}
                    >
                      <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {section.name}
                      </span>
                      {section.docs.length === 0 ? (
                        <span className="px-2 py-0.5 text-xs italic text-muted-foreground/60">
                          {isDragging ? "Drop here" : "No docs yet"}
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
                              draggable
                              onDragStart={(e) => {
                                setIsDragging(true);
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData(
                                  DRAG_TYPE,
                                  JSON.stringify({
                                    docId: doc.id,
                                    docSlug: doc.slug,
                                    sectionName: section.name,
                                  })
                                );
                              }}
                              onDragEnd={() => {
                                setIsDragging(false);
                                setDropTarget(null);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setMenu({
                                  x: Math.min(e.clientX, window.innerWidth - 220),
                                  y: Math.min(e.clientY, window.innerHeight - 200),
                                  doc,
                                });
                              }}
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

      {/* Right-click context menu */}
      {menu && (
        <div
          className="fixed z-[90] w-52 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextItem
            icon={<ExternalLink className="h-4 w-4" />}
            label="Open in new tab"
            onClick={() =>
              menuAction(() => window.open(`/tools/wiki/${menu.doc.slug}`, "_blank"))
            }
          />
          <ContextItem
            icon={<CopyPlus className="h-4 w-4" />}
            label="Duplicate"
            onClick={() =>
              menuAction(() =>
                startTransition(async () => {
                  const result = await duplicateWikiDoc(menu.doc.id);
                  if (!result.ok || !result.slug) {
                    toast.error(result.error ?? "Could not duplicate.");
                    return;
                  }
                  router.push(`/tools/wiki/${result.slug}`);
                })
              )
            }
          />
          <ContextItem
            icon={<Pencil className="h-4 w-4" />}
            label="Rename"
            onClick={() =>
              menuAction(() => {
                const next = window.prompt("Rename doc:", menu.doc.title);
                if (next === null || !next.trim()) return;
                startTransition(async () => {
                  const result = await updateWikiDoc(menu.doc.id, { title: next });
                  if (!result.ok) toast.error(result.error ?? "Could not rename.");
                });
              })
            }
          />
          <div className="-mx-1 my-1 h-px bg-border" />
          <ContextItem
            icon={<Trash2 className="h-4 w-4" />}
            label="Delete"
            destructive
            onClick={() =>
              menuAction(() => {
                if (!window.confirm(`Delete "${menu.doc.title}"? This can't be undone.`)) return;
                startTransition(async () => {
                  const result = await deleteWikiDoc(menu.doc.id);
                  if (!result.ok) {
                    toast.error(result.error ?? "Could not delete.");
                    return;
                  }
                  if (pathname.startsWith(`/tools/wiki/${menu.doc.slug}`)) {
                    router.push("/tools/wiki");
                  }
                });
              })
            }
          />
        </div>
      )}
    </aside>
  );
}

function ContextItem({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm hover:bg-muted",
        destructive ? "text-destructive hover:bg-destructive/10" : "text-popover-foreground"
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}
