"use client";

import { useState, useTransition } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { restoreProject } from "@/app/(app)/projects/[slug]/actions";
import type { Project } from "@/types/database";

export function ArchivedProjectsSection({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (projects.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        Archived projects ({projects.length})
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3"
            >
              <span className="truncate text-sm font-medium">{project.name}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    restoreProject(project.id);
                  });
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
