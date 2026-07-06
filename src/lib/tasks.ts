import type { Task } from "@/types/database";

export function isTaskCompleted(task: Pick<Task, "completed_at">): boolean {
  return task.completed_at !== null;
}
