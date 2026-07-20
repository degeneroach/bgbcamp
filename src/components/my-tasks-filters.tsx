"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MyTasksFilters({
  projects,
}: {
  projects: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all" || (key === "sort" && value === "due")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const projectItems: Record<string, React.ReactNode> = {
    all: "All projects",
    ...Object.fromEntries(projects.map((p) => [p.slug, p.name])),
  };
  const sortItems: Record<string, React.ReactNode> = {
    due: "By due date",
    assigned: "Recently assigned",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={projectItems}
        value={searchParams.get("project") ?? "all"}
        onValueChange={(v) => setParam("project", v)}
      >
        <SelectTrigger className="h-8 w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.slug} value={project.slug}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={sortItems}
        value={searchParams.get("sort") ?? "due"}
        onValueChange={(v) => setParam("sort", v)}
      >
        <SelectTrigger className="h-8 w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="due">By due date</SelectItem>
          <SelectItem value="assigned">Recently assigned</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
