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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search activity..."
          className="h-8 w-48 pl-8"
        />
      </div>

      {projects && (
        <Select value={searchParams.get("project") ?? "all"} onValueChange={(v) => setParam("project", v)}>
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Project" />
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
      )}

      <Select value={searchParams.get("person") ?? "all"} onValueChange={(v) => setParam("person", v)}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="Person" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Everyone</SelectItem>
          {people.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              <UserAvatar name={person.full_name} email={person.email} avatarUrl={person.avatar_url} className="h-4 w-4" />
              {person.full_name || person.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("type") ?? "all"} onValueChange={(v) => setParam("type", v)}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {ACTIVITY_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("range") ?? "all"} onValueChange={(v) => setParam("range", v)}>
        <SelectTrigger className="h-8 w-[130px]">
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This week</SelectItem>
          <SelectItem value="month">This month</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
