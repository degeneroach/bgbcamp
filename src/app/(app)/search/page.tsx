import Link from "next/link";
import { Suspense } from "react";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { runSearch } from "@/lib/search";
import { SearchInput } from "@/components/search-input";
import { Card } from "@/components/ui/card";
import { FolderKanban, CheckSquare, MessageSquare, User } from "lucide-react";
import type { SearchResult } from "@/lib/search";

const ICONS: Record<SearchResult["type"], React.ComponentType<{ className?: string }>> = {
  project: FolderKanban,
  task: CheckSquare,
  post: MessageSquare,
  person: User,
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const results = q.trim().length >= 2 ? await runSearch(supabase, organization.id, q) : [];

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find projects, tasks, posts, and people across {organization.name}.
        </p>
      </div>
      <Suspense>
        <SearchInput />
      </Suspense>

      {q.trim().length >= 2 && (
        <Card className="divide-y p-2">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{q}&rdquo;.
            </p>
          ) : (
            results.map((result) => {
              const Icon = ICONS[result.type];
              return (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{result.title}</span>
                  {result.subtitle && (
                    <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                  )}
                  <span className="text-[10px] uppercase text-muted-foreground/70">{result.type}</span>
                </Link>
              );
            })
          )}
        </Card>
      )}
    </div>
  );
}
