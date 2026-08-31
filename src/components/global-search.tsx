"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search, FolderKanban, CheckSquare, MessageSquare, User } from "lucide-react";
import type { SearchResult } from "@/lib/search";

const ICONS: Record<SearchResult["type"], React.ComponentType<{ className?: string }>> = {
  project: FolderKanban,
  task: CheckSquare,
  post: MessageSquare,
  person: User,
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isMac, setIsMac] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMac(/Mac|iP(hone|ad|od)/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const showResults = query.trim().length >= 2;

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    if (!showResults) return groups;
    for (const result of results) {
      groups[result.type] = groups[result.type] ?? [];
      groups[result.type].push(result);
    }
    return groups;
  }, [results, showResults]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      {/* Icon-only at every width — the search itself is the full-screen
          command overlay, so the header only needs a trigger. */}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Search"
        title={`Search (${isMac ? "⌘K" : "Ctrl K"})`}
        className="border-[#33402a]/15 bg-white/60 shadow-none hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Jump to a project, task, post, or person">
        <CommandInput
          placeholder="Search projects, tasks, posts, people..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {showResults && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {(["project", "task", "post", "person"] as const).map((type) => {
            const items = grouped[type];
            if (!items?.length) return null;
            const Icon = ICONS[type];
            return (
              <CommandGroup key={type} heading={`${type.charAt(0).toUpperCase()}${type.slice(1)}s`}>
                {items.map((item) => (
                  <CommandItem key={`${type}-${item.id}`} value={`${type}-${item.id}-${item.title}`} onSelect={() => go(item.href)}>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.title}</span>
                    {item.subtitle && (
                      <span className="ml-auto text-xs text-muted-foreground">{item.subtitle}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
