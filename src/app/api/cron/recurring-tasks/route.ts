import { format, parseISO } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push";
import type { RecurringTask } from "@/types/database";

// Daily scheduler (Vercel Cron, 9:00 UTC ≈ 1-2am Pacific): materializes due
// recurring-task templates into real tasks, then advances next_run.

function advance(template: RecurringTask, from: string): string {
  const date = parseISO(from);
  if (template.cadence === "weekly") {
    date.setDate(date.getDate() + 7);
  } else {
    // Monthly on day 1-28: bump the month, keep the day (always valid ≤28).
    date.setMonth(date.getMonth() + 1);
    date.setDate(template.cadence_day);
  }
  return format(date, "yyyy-MM-dd");
}

export async function GET(request: Request) {
  // Vercel sends Authorization: Bearer <CRON_SECRET> when the env is set.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: due, error } = await admin
    .from("recurring_tasks")
    .select("*")
    .eq("active", true)
    .lte("next_run", today);
  if (error) {
    console.error("recurring cron: fetch failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  let created = 0;
  for (const template of (due ?? []) as RecurringTask[]) {
    try {
      // If the schedule fell behind (template paused, cron hiccup), create
      // ONE task now rather than back-filling every missed occurrence.
      let nextRun = template.next_run;
      while (advance(template, nextRun) <= today) nextRun = advance(template, nextRun);

      const { count } = await admin
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("task_list_id", template.task_list_id);

      // "{date}" in the title becomes the occurrence date, e.g. "October 1".
      const title = template.title.replace(
        /\{date\}/g,
        format(parseISO(nextRun), "MMMM d")
      );

      const { data: task, error: insertError } = await admin
        .from("tasks")
        .insert({
          project_id: template.project_id,
          task_list_id: template.task_list_id,
          title,
          description_html: template.description_html,
          created_by: template.created_by,
          due_date: nextRun,
          position: count ?? 0,
        })
        .select("id, title")
        .single();
      if (insertError || !task) throw insertError ?? new Error("insert failed");

      if (template.assignee_ids.length > 0) {
        await admin.from("task_assignees").insert(
          template.assignee_ids.map((userId) => ({ task_id: task.id, user_id: userId }))
        );
      }

      await admin.from("activity_events").insert({
        organization_id: template.organization_id,
        project_id: template.project_id,
        actor_id: template.created_by,
        entity_type: "task",
        entity_id: task.id,
        action: "task.created",
        metadata: { title: task.title, recurring: "true" },
      });

      const { data: project } = await admin
        .from("projects")
        .select("slug")
        .eq("id", template.project_id)
        .maybeSingle();
      await sendPushToUsers(template.assignee_ids, {
        title: "Recurring task is due",
        body: task.title,
        url: project ? `/projects/${project.slug}/tasks/${task.id}` : "/my-tasks",
        tag: `recurring-${template.id}-${nextRun}`,
      });

      await admin
        .from("recurring_tasks")
        .update({ next_run: advance(template, nextRun) })
        .eq("id", template.id);
      created += 1;
    } catch (err) {
      console.error("recurring cron: template failed", template.id, err);
    }
  }

  return Response.json({ ok: true, created });
}
