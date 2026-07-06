"use client";

import { useState, useTransition } from "react";
import { renameOrganization } from "@/app/(app)/actions";

export function OrganizationNameEditor({ name }: { name: string }) {
  const [value, setValue] = useState(name);
  const [, startTransition] = useTransition();

  function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setValue(name);
      return;
    }
    if (trimmed === name) return;
    startTransition(() => {
      renameOrganization(trimmed);
    });
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          setValue(name);
          (e.target as HTMLInputElement).blur();
        }
      }}
      aria-label="Organization name"
      title="Click to rename your organization"
      className="w-full truncate rounded border border-transparent bg-transparent px-1 -mx-1 text-[11px] text-muted-foreground outline-none hover:border-input focus:border-input focus:bg-background focus:text-foreground"
    />
  );
}
