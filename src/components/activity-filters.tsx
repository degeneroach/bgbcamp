"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { Search } from "lucide-react";
import { displayName } from "@/lib/display-name";
import type { Profile, Project } from "@/types/database";

const ACTIVITY_TYPES = [
  { value: "all", label: "All activity" },
  { value: "task", label: "Tasks" },
  { value: "comment", label: "Comments" },
  { value: "image", label: "Attachments" },
  { value: "project", label: "Projects" },
];

export function ActivityFilters({
  projects,
  people,
}: {
  projects?: Project[];
  people: Profile[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query !== (searchParams.get("q") ?? "")) {
        setParam("q", query);
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const projectItems: Record<string, React.ReactNode> = {
    all: "All projects",
    ...Object.fromEntries((projects ?? []).map((p) => [p.slug, p.name])),
  };
  const personItems: Record<string, React.ReactNode> = {
    all: "Everyone",
    ...Object.fromEntries(people.map((p) => [p.id, displayName(p)])),
  };
  const typeItems: Record<string, React.ReactNode> = Object.fromEntries(
    ACTIVITY_TYPES.map((t) => [t.value, t.label])
  );
  const rangeItems: Record<string, React.ReactNode> = {
    all: "All time",
    today: "Today",
    week: "This week",
    month: "This month",
  };

  return (
    <div className="grid grid-cols-2 items-end gap-x-3 gap-y-2 sm:grid-cols-3 md:grid-cols-5">
      <Field label="Search" htmlFor="activity-search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="activity-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity..."
            className="h-8 w-full pl-8"
          />
        </div>
      </Field>

      {projects && (
        <Field label="Project" htmlFor="activity-project">
          <Select
            items={projectItems}
            value={searchParams.get("project") ?? "all"}
            onValueChange={(v) => setParam("project", v)}
          >
            <SelectTrigger id="activity-project" className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.slug}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field label="Person" htmlFor="activity-person">
        <Select
          items={personItems}
          value={searchParams.get("person") ?? "all"}
          onValueChange={(v) => setParam("person", v)}
        >
          <SelectTrigger id="activity-person" className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            {people.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                <UserAvatar name={person.full_name} email={person.email} avatarUrl={person.avatar_url} className="h-4 w-4" />
                {displayName(person)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Type" htmlFor="activity-type">
        <Select
          items={typeItems}
          value={searchParams.get("type") ?? "all"}
          onValueChange={(v) => setParam("type", v)}
        >
          <SelectTrigger id="activity-type" className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="When" htmlFor="activity-range">
        <Select
          items={rangeItems}
          value={searchParams.get("range") ?? "all"}
          onValueChange={(v) => setParam("range", v)}
        >
          <SelectTrigger id="activity-range" className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
