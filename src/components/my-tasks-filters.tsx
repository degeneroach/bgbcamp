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
  people,
}: {
  projects: { slug: string; name: string }[];
  /** Admin-only person switcher: view a teammate's plate. */
  people?: { id: string; label: string; isSelf: boolean }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (
      !value ||
      value === "all" ||
      (key === "sort" && value === "due") ||
      (key === "person" && value === "self")
    ) {
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

  const peopleItems: Record<string, React.ReactNode> | null = people
    ? Object.fromEntries(people.map((p) => [p.isSelf ? "self" : p.id, p.label]))
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {people && peopleItems && (
        <Select
          items={peopleItems}
          value={searchParams.get("person") ?? "self"}
          onValueChange={(v) => setParam("person", v)}
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {people.map((person) => (
              <SelectItem key={person.id} value={person.isSelf ? "self" : person.id}>
                {person.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
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
