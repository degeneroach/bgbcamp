import type { ActivityEvent } from "@/types/database";

// Returns the verb phrase for an activity event, e.g. "created the project
// “Amazon PPC”". Callers prefix this with the actor's name.
export function activitySummary(event: Pick<ActivityEvent, "action" | "metadata">): string {
  const m = event.metadata as Record<string, string | undefined>;
  const title = m.title ? `“${m.title}”` : "";

  switch (event.action) {
    case "project.created":
      return `created the project “${m.name}”`;
    case "post.created":
      return `posted ${title}`;
    case "post.updated":
      return `updated the post ${title}`;
    case "post_comment.created":
      return `commented on “${m.postTitle}”`;
    case "task.created":
      return `created the task ${title}`;
    case "task.assigned":
      return `assigned ${title} to ${m.assigneeName}`;
    case "task.completed":
      return `completed ${title}`;
    case "task.reopened":
      return `reopened ${title}`;
    case "task_comment.created":
      return `commented on “${m.taskTitle}”`;
    case "task.due_date_changed":
      return m.dueDate ? `set the due date on ${title} to ${m.dueDate}` : `cleared the due date on ${title}`;
    case "task.image_added":
      return `attached an image to ${title}`;
    case "task.file_added":
      return `attached ${m.fileName ?? "a file"} to ${title}`;
    case "task.boosted":
      return `boosted ${title}${m.emoji ? ` with ${m.emoji}` : ""}`;
    case "task_comment.boosted":
      return `boosted a comment on ${title}${m.emoji ? ` with ${m.emoji}` : ""}`;
    case "task.priority_changed":
      return `set ${title} to ${m.priority} priority`;
    case "project.renamed":
      return `renamed the project to “${m.name}”`;
    case "project.archived":
      return `archived the project “${m.name}”`;
    case "task_list.created":
      return `created the list “${m.name}”`;
    case "task_list.renamed":
      return `renamed a list to “${m.name}”`;
    case "person.added":
      return `invited ${m.email} to the team`;
    default:
      return event.action.replace(/[._]/g, " ");
  }
}

// Shortened variant for a task's own activity panel, where repeating the
// task title on every line is pure noise ("completed this task" instead of
// "completed “25% OFF - Biodegradable Golf Balls”").
export function taskActivitySummary(event: Pick<ActivityEvent, "action" | "metadata">): string {
  const m = event.metadata as Record<string, string | undefined>;

  switch (event.action) {
    case "task.created":
      return "created this task";
    case "task.completed":
      return "completed this task";
    case "task.reopened":
      return "reopened this task";
    case "task.assigned":
      return m.assigneeName ? `assigned this to ${m.assigneeName}` : "updated assignees";
    case "task.due_date_changed":
      return m.dueDate ? `set the due date to ${m.dueDate}` : "cleared the due date";
    case "task.image_added":
      return "attached an image";
    case "task.file_added":
      return m.fileName ? `attached ${m.fileName}` : "attached a file";
    case "task_comment.created":
      return "commented";
    case "task.boosted":
      return `boosted this task${m.emoji ? ` ${m.emoji}` : ""}`;
    case "task_comment.boosted":
      return `boosted a comment${m.emoji ? ` ${m.emoji}` : ""}`;
    default:
      return activitySummary(event);
  }
}
