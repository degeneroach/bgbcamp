"use server";

import { revalidatePath } from "next/cache";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { sanitizeHtml } from "@/lib/sanitize";

interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface RecurringTaskInput {
  projectId: string;
  taskListId: string;
  title: string;
  descriptionHtml: string;
  assigneeIds: string[];
  cadence: "weekly" | "monthly";
  /** weekly: 0-6 (Sun-Sat); monthly: 1-28 */
  cadenceDay: number;
}

// First occurrence strictly in the future (today counts if it matches).
function firstRun(cadence: "weekly" | "monthly", cadenceDay: number): string {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (cadence === "weekly") {
    const diff = (cadenceDay - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + diff);
  } else {
    candidate.setDate(cadenceDay);
    if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      candidate.setMonth(candidate.getMonth() + 1);
      candidate.setDate(cadenceDay);
    }
  }
  return format(candidate, "yyyy-MM-dd");
}

export async function createRecurringTask(
  projectSlug: string,
  input: RecurringTaskInput
): Promise<ActionResult> {
  if (!input.title.trim()) return { ok: false, error: "Give the task a title." };
  if (
    (input.cadence === "weekly" && (input.cadenceDay < 0 || input.cadenceDay > 6)) ||
    (input.cadence === "monthly" && (input.cadenceDay < 1 || input.cadenceDay > 28))
  ) {
    return { ok: false, error: "Pick a valid day." };
  }

  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase.from("recurring_tasks").insert({
    organization_id: organization.id,
    project_id: input.projectId,
    task_list_id: input.taskListId,
    title: input.title.trim(),
    description_html: sanitizeHtml(input.descriptionHtml),
    assignee_ids: input.assigneeIds,
    cadence: input.cadence,
    cadence_day: input.cadenceDay,
    next_run: firstRun(input.cadence, input.cadenceDay),
    created_by: userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectSlug}`);
  return { ok: true };
}

export async function setRecurringTaskActive(
  id: string,
  projectSlug: string,
  active: boolean
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createClient();
  // Re-activating recomputes next_run so a long-paused template doesn't
  // fire immediately for a date in the past.
  const update: { active: boolean; next_run?: string } = { active };
  if (active) {
    const { data: row } = await supabase
      .from("recurring_tasks")
      .select("cadence, cadence_day, next_run")
      .eq("id", id)
      .maybeSingle();
    if (row && parseISO(row.next_run) < new Date()) {
      update.next_run = firstRun(row.cadence as "weekly" | "monthly", row.cadence_day);
    }
  }
  const { error } = await supabase.from("recurring_tasks").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/projects/${projectSlug}`);
  return { ok: true };
}

export async function deleteRecurringTask(id: string, projectSlug: string): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/projects/${projectSlug}`);
  return { ok: true };
}
