import {
  CheckCircle2,
  MessageSquare,
  ListPlus,
  Image as ImageIcon,
  File as FileIcon,
  Pencil,
  UserPlus,
  UserMinus,
  FolderPlus,
  Archive,
  CalendarClock,
  RotateCcw,
  Zap,
  Activity as ActivityIcon,
  type LucideIcon,
} from "lucide-react";
import type { ActivityEvent } from "@/types/database";

// Icon shown in the timeline's circular marker for each action. Unknown/
// future action strings fall back to a generic pulse icon rather than
// breaking, so new event types can be added on the backend at any time
// without a UI change.
const ICONS: Record<string, LucideIcon> = {
  "task.created": ListPlus,
  "task.completed": CheckCircle2,
  "task.reopened": RotateCcw,
  "task.edited": Pencil,
  "task.assigned": UserPlus,
  "task.due_date_changed": CalendarClock,
  "task.image_added": ImageIcon,
  "task.file_added": FileIcon,
  "task.priority_changed": Pencil,
  "task_comment.created": MessageSquare,
  "task.boosted": Zap,
  "task_comment.boosted": Zap,
  "post.created": MessageSquare,
  "post.updated": Pencil,
  "post_comment.created": MessageSquare,
  "project.created": FolderPlus,
  "project.archived": Archive,
  "project.renamed": Pencil,
  "task_list.created": ListPlus,
  "task_list.renamed": Pencil,
  "person.added": UserPlus,
  "person.removed": UserMinus,
};

export function getActivityIcon(action: string): LucideIcon {
  return ICONS[action] ?? ActivityIcon;
}

export type ActivityTypeBucket = "task" | "comment" | "image" | "project";

const TYPE_BUCKETS: Record<string, ActivityTypeBucket> = {
  "task.created": "task",
  "task.completed": "task",
  "task.reopened": "task",
  "task.edited": "task",
  "task.assigned": "task",
  "task.due_date_changed": "task",
  "task.priority_changed": "task",
  "task_list.created": "task",
  "task_list.renamed": "task",
  "task_comment.created": "comment",
  "task.boosted": "task",
  "task_comment.boosted": "comment",
  "post.created": "comment",
  "post.updated": "comment",
  "post_comment.created": "comment",
  "task.image_added": "image",
  "task.file_added": "image",
  "project.created": "project",
  "project.archived": "project",
  "project.renamed": "project",
  "person.added": "project",
  "person.removed": "project",
};

export function getActivityTypeBucket(action: string): ActivityTypeBucket | null {
  return TYPE_BUCKETS[action] ?? null;
}

export interface ActivityDisplay {
  /** e.g. "completed", "commented on", "attached an image to" */
  verb: string;
  /** The task/project/post/list name — rendered as the clickable part. */
  itemLabel: string | null;
  /** Link target for itemLabel, if any. */
  itemHref: string | null;
  /** Extra trailing detail, e.g. "to Sam" for assignments. */
  detail?: string;
}

type Metadata = Record<string, string | undefined>;

export function describeActivity(
  event: Pick<ActivityEvent, "action" | "entity_id" | "metadata">,
  projectSlug: string | null
): ActivityDisplay {
  const m = event.metadata as Metadata;
  const taskHref = projectSlug ? `/projects/${projectSlug}/tasks/${event.entity_id}` : null;
  const projectHref = projectSlug ? `/projects/${projectSlug}` : null;
  const boardHref = projectSlug ? `/projects/${projectSlug}/board` : null;

  switch (event.action) {
    case "task.created":
      return { verb: "created", itemLabel: m.title ?? null, itemHref: taskHref };
    case "task.completed":
      return { verb: "completed", itemLabel: m.title ?? null, itemHref: taskHref };
    case "task.reopened":
      return { verb: "reopened", itemLabel: m.title ?? null, itemHref: taskHref };
    case "task.edited":
      return { verb: "edited", itemLabel: m.title ?? null, itemHref: taskHref };
    case "task.assigned":
      return {
        verb: "assigned",
        itemLabel: m.title ?? null,
        itemHref: taskHref,
        detail: m.assigneeName ? `to ${m.assigneeName}` : undefined,
      };
    case "task.due_date_changed":
      return {
        verb: m.dueDate ? "set the due date on" : "cleared the due date on",
        itemLabel: m.title ?? null,
        itemHref: taskHref,
        detail: m.dueDate,
      };
    case "task.image_added":
      return { verb: "attached an image to", itemLabel: m.title ?? null, itemHref: taskHref };
    case "task.file_added":
      return { verb: "attached a file to", itemLabel: m.title ?? null, itemHref: taskHref };
    case "task.priority_changed":
      return {
        verb: "set the priority on",
        itemLabel: m.title ?? null,
        itemHref: taskHref,
        detail: m.priority,
      };
    case "task_comment.created":
      return { verb: "commented on", itemLabel: m.taskTitle ?? null, itemHref: taskHref };
    case "task.boosted":
      return {
        verb: "boosted",
        itemLabel: m.title ?? null,
        itemHref: taskHref,
        detail: m.emoji ? `with ${m.emoji}` : undefined,
      };
    case "task_comment.boosted":
      return {
        verb: "boosted a comment on",
        itemLabel: m.title ?? null,
        itemHref: taskHref,
        detail: m.emoji ? `with ${m.emoji}` : undefined,
      };
    case "post.created":
      return {
        verb: "posted",
        itemLabel: m.title ?? null,
        itemHref: boardHref ? `${boardHref}#post-${event.entity_id}` : null,
      };
    case "post.updated":
      return {
        verb: "updated the post",
        itemLabel: m.title ?? null,
        itemHref: boardHref ? `${boardHref}#post-${event.entity_id}` : null,
      };
    case "post_comment.created":
      return {
        verb: "commented on",
        itemLabel: m.postTitle ?? null,
        itemHref: boardHref && m.postId ? `${boardHref}#post-${m.postId}` : null,
      };
    case "project.created":
      return { verb: "created the project", itemLabel: m.name ?? null, itemHref: projectHref };
    case "project.archived":
      return { verb: "archived the project", itemLabel: m.name ?? null, itemHref: projectHref };
    case "project.renamed":
      return {
        verb: "renamed the project to",
        itemLabel: m.name ?? null,
        itemHref: projectHref,
        detail: m.previousName ? `from “${m.previousName}”` : undefined,
      };
    case "task_list.created":
      return { verb: "created the list", itemLabel: m.name ?? null, itemHref: projectHref };
    case "task_list.renamed":
      return { verb: "renamed a list to", itemLabel: m.name ?? null, itemHref: projectHref };
    case "person.added":
      return { verb: "invited", itemLabel: m.email ?? null, itemHref: "/people" };
    case "person.removed":
      return { verb: "removed", itemLabel: m.email ?? null, itemHref: "/people" };
    default:
      return {
        verb: event.action.replace(/[._]/g, " "),
        itemLabel: m.title ?? m.name ?? null,
        itemHref: taskHref,
      };
  }
}
