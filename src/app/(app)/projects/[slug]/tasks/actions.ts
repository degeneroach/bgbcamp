"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { logActivity } from "@/lib/activity";
import { sanitizeHtml } from "@/lib/sanitize";
import { extractMentionIds, htmlToExcerpt } from "@/lib/mentions";
import { createMentionNotifications } from "@/lib/notifications";
import type { Task } from "@/types/database";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function taskPaths(projectSlug: string, taskId?: string) {
  revalidatePath(`/projects/${projectSlug}/tasks`);
  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath(`/projects/${projectSlug}/activity`);
  revalidatePath("/activity");
  revalidatePath("/people");
  if (taskId) revalidatePath(`/projects/${projectSlug}/tasks/${taskId}`);
}

export async function createTaskList(
  projectId: string,
  projectSlug: string,
  name: string
): Promise<ActionResult> {
  if (name.trim().length < 1) {
    return { ok: false, error: "Give the list a name." };
  }

  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { count } = await supabase
    .from("task_lists")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const trimmedName = name.trim();
  const { data: list, error } = await supabase
    .from("task_lists")
    .insert({ project_id: projectId, name: trimmedName, position: count ?? 0 })
    .select()
    .single();

  if (error || !list) return { ok: false, error: error?.message ?? "Could not create list." };

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId,
    actorId: userId,
    entityType: "task_list",
    entityId: list.id,
    action: "task_list.created",
    metadata: { name: trimmedName },
  });

  revalidatePath(`/projects/${projectSlug}/tasks`);
  return { ok: true };
}

export async function renameTaskList(
  taskListId: string,
  projectSlug: string,
  name: string
): Promise<ActionResult> {
  if (name.trim().length < 1) {
    return { ok: false, error: "List name can't be empty." };
  }

  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("task_lists")
    .select("name, project_id")
    .eq("id", taskListId)
    .single();

  const trimmedName = name.trim();
  const { error } = await supabase
    .from("task_lists")
    .update({ name: trimmedName })
    .eq("id", taskListId);

  if (error) return { ok: false, error: error.message };

  if (existing && existing.name !== trimmedName) {
    await logActivity(supabase, {
      organizationId: organization.id,
      projectId: existing.project_id,
      actorId: userId,
      entityType: "task_list",
      entityId: taskListId,
      action: "task_list.renamed",
      metadata: { previousName: existing.name, name: trimmedName },
    });
  }

  revalidatePath(`/projects/${projectSlug}/tasks`);
  return { ok: true };
}

export async function deleteTaskList(
  taskListId: string,
  projectSlug: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Tasks in this list cascade-delete via the FK, along with their
  // comments/images (those cascade from tasks in turn).
  const { error } = await supabase.from("task_lists").delete().eq("id", taskListId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectSlug}/tasks`);
  return { ok: true };
}

export async function createTask(
  projectId: string,
  projectSlug: string,
  taskListId: string,
  title: string
): Promise<ActionResult> {
  if (title.trim().length < 1) {
    return { ok: false, error: "Give the task a title." };
  }

  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("task_list_id", taskListId);

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      task_list_id: taskListId,
      title: title.trim(),
      created_by: userId,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error || !task) return { ok: false, error: error?.message ?? "Could not create task." };

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId,
    actorId: userId,
    entityType: "task",
    entityId: task.id,
    action: "task.created",
    metadata: { title: task.title },
  });

  taskPaths(projectSlug);
  return { ok: true };
}

export async function toggleTaskCompleted(
  taskId: string,
  projectId: string,
  projectSlug: string,
  taskTitle: string,
  completed: boolean
): Promise<ActionResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", taskId);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId,
    actorId: userId,
    entityType: "task",
    entityId: taskId,
    action: completed ? "task.completed" : "task.reopened",
    metadata: { title: taskTitle },
  });

  taskPaths(projectSlug, taskId);
  return { ok: true };
}

export interface UpdateTaskInput {
  title?: string;
  descriptionHtml?: string;
  dueDate?: string | null;
}

export async function updateTask(
  taskId: string,
  projectId: string,
  projectSlug: string,
  input: UpdateTaskInput
): Promise<ActionResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("tasks").select("*").eq("id", taskId).single();

  if (!existing) return { ok: false, error: "Task not found." };

  const update: Partial<Task> = {};
  if (input.title !== undefined) update.title = input.title.trim();
  if (input.descriptionHtml !== undefined) update.description_html = sanitizeHtml(input.descriptionHtml);
  if (input.dueDate !== undefined) update.due_date = input.dueDate;

  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  const title = input.title?.trim() || existing.title;

  if (input.dueDate !== undefined && input.dueDate !== existing.due_date) {
    await logActivity(supabase, {
      organizationId: organization.id,
      projectId,
      actorId: userId,
      entityType: "task",
      entityId: taskId,
      action: "task.due_date_changed",
      metadata: { title, dueDate: input.dueDate },
    });
  }

  taskPaths(projectSlug, taskId);
  return { ok: true };
}

export async function addTaskAssignee(
  taskId: string,
  projectId: string,
  projectSlug: string,
  taskTitle: string,
  userId: string
): Promise<ActionResult> {
  const { userId: actorId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("task_assignees")
    .upsert({ task_id: taskId, user_id: userId }, { onConflict: "task_id,user_id" });

  if (error) return { ok: false, error: error.message };

  const { data: assignee } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId,
    actorId,
    entityType: "task",
    entityId: taskId,
    action: "task.assigned",
    metadata: { title: taskTitle, assigneeName: assignee?.full_name || assignee?.email || "someone" },
  });

  taskPaths(projectSlug, taskId);
  return { ok: true };
}

export async function removeTaskAssignee(
  taskId: string,
  projectSlug: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };

  taskPaths(projectSlug, taskId);
  return { ok: true };
}

export async function createTaskComment(
  taskId: string,
  projectId: string,
  projectSlug: string,
  taskTitle: string,
  bodyHtml: string
): Promise<ActionResult> {
  const cleaned = sanitizeHtml(bodyHtml);
  if (htmlToExcerpt(cleaned).length < 1) return { ok: false, error: "Comment can't be empty." };

  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: comment, error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, author_id: userId, body: cleaned })
    .select()
    .single();

  if (error || !comment) return { ok: false, error: error?.message ?? "Could not add comment." };

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId,
    actorId: userId,
    entityType: "task_comment",
    entityId: taskId,
    action: "task_comment.created",
    metadata: { taskTitle, commentId: comment.id, bodyPreview: htmlToExcerpt(cleaned) },
  });

  await createMentionNotifications(supabase, {
    organizationId: organization.id,
    projectId,
    actorId: userId,
    mentionedUserIds: extractMentionIds(cleaned),
    entityType: "task_comment",
    entityId: comment.id,
    taskId,
    bodyHtml: cleaned,
  });

  taskPaths(projectSlug, taskId);
  return { ok: true };
}

export async function recordTaskImage(
  taskId: string,
  projectId: string,
  projectSlug: string,
  taskTitle: string,
  storagePath: string,
  url: string
): Promise<ActionResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase.from("task_images").insert({
    task_id: taskId,
    storage_path: storagePath,
    url,
    uploaded_by: userId,
  });

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    organizationId: organization.id,
    projectId,
    actorId: userId,
    entityType: "task_image",
    entityId: taskId,
    action: "task.image_added",
    metadata: { title: taskTitle, imageUrl: url },
  });

  taskPaths(projectSlug, taskId);
  return { ok: true };
}

export async function deleteTaskImage(
  imageId: string,
  storagePath: string,
  projectSlug: string,
  taskId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.storage.from("task-images").remove([storagePath]);
  const { error } = await supabase.from("task_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: error.message };
  taskPaths(projectSlug, taskId);
  return { ok: true };
}
