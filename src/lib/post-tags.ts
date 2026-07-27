import {
  Megaphone,
  ClipboardList,
  GraduationCap,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

// Message board post categories. One tag per post, single source of truth
// for the composer pills, post badges, and board filter chips.
export interface PostTag {
  value: string;
  label: string;
  icon: LucideIcon;
  /** Chip/badge styling when active. */
  activeClass: string;
  badgeClass: string;
}

export const POST_TAGS: PostTag[] = [
  {
    value: "announcement",
    label: "Announcement",
    icon: Megaphone,
    activeClass:
      "border-amber-400 bg-amber-400/15 font-medium text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-400/15 text-amber-600 dark:text-amber-400",
  },
  {
    value: "sop",
    label: "SOP",
    icon: ClipboardList,
    activeClass: "border-sky-400 bg-sky-400/15 font-medium text-sky-600 dark:text-sky-400",
    badgeClass: "bg-sky-400/15 text-sky-600 dark:text-sky-400",
  },
  {
    value: "education",
    label: "Education",
    icon: GraduationCap,
    activeClass:
      "border-violet-400 bg-violet-400/15 font-medium text-violet-600 dark:text-violet-400",
    badgeClass: "bg-violet-400/15 text-violet-600 dark:text-violet-400",
  },
  {
    value: "resource",
    label: "Resources",
    icon: FolderOpen,
    activeClass:
      "border-emerald-400 bg-emerald-400/15 font-medium text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400",
  },
];

export const POST_TAG_VALUES = POST_TAGS.map((t) => t.value);

export function getPostTag(value: string | null | undefined): PostTag | null {
  if (!value) return null;
  return POST_TAGS.find((t) => t.value === value) ?? null;
}
