import { format, parseISO } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { displayName } from "@/lib/display-name";
import type { Profile } from "@/types/database";

// Monday-morning digest (Vercel Cron): each opted-in teammate gets one
// email listing their open tasks, grouped by project. No tasks = no email.

interface DigestTask {
  id: string;
  title: string;
  due_date: string | null;
  projectName: string;
  projectSlug: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("weekly digest skipped: RESEND_API_KEY not set");
    return Response.json({ ok: true, sent: 0 });
  }

  const admin = createAdminClient();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://bgbcamp.com").replace(/\/$/, "");
  const from =
    process.env.ORDER_FROM_EMAIL ?? "BGBCamp <orders@updates.customgolfballprinting.com>";

  const { data: recipients } = await admin
    .from("profiles")
    .select("*")
    .eq("weekly_digest", true);

  let sent = 0;
  for (const person of (recipients ?? []) as Profile[]) {
    try {
      const { data: rows } = await admin
        .from("task_assignees")
        .select("tasks!inner(id, title, due_date, completed_at, projects!inner(name, slug, archived))")
        .eq("user_id", person.id);

      const tasks: DigestTask[] = [];
      for (const row of (rows ?? []) as unknown as {
        tasks: {
          id: string;
          title: string;
          due_date: string | null;
          completed_at: string | null;
          projects: { name: string; slug: string; archived: boolean };
        };
      }[]) {
        const t = row.tasks;
        if (t.completed_at || t.projects.archived) continue;
        tasks.push({
          id: t.id,
          title: t.title,
          due_date: t.due_date,
          projectName: t.projects.name,
          projectSlug: t.projects.slug,
        });
      }
      if (tasks.length === 0) continue;

      // Group by project; overdue/soonest due first within each.
      const byProject = new Map<string, DigestTask[]>();
      for (const task of tasks) {
        const list = byProject.get(task.projectName) ?? [];
        list.push(task);
        byProject.set(task.projectName, list);
      }
      for (const list of byProject.values()) {
        list.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
      }

      const today = format(new Date(), "yyyy-MM-dd");
      const sections = Array.from(byProject.entries())
        .map(
          ([projectName, list]) => `
      <h2 style="margin:20px 0 6px;font-size:14px;color:#111;">${esc(projectName)}</h2>
      <ul style="margin:0;padding-left:18px;">
        ${list
          .map((task) => {
            const overdue = task.due_date && task.due_date < today;
            const due = task.due_date
              ? ` <span style="color:${overdue ? "#dc2626" : "#666"};font-size:12px;">${
                  overdue ? "overdue — " : "due "
                }${format(parseISO(task.due_date), "MMM d")}</span>`
              : "";
            return `<li style="margin:4px 0;font-size:14px;"><a href="${appUrl}/projects/${task.projectSlug}/tasks/${task.id}" style="color:#0b6bcb;text-decoration:none;">${esc(task.title)}</a>${due}</li>`;
          })
          .join("")}
      </ul>`
        )
        .join("");

      const html = `
<div style="background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e5ea;border-radius:8px;padding:24px;">
    <h1 style="margin:0 0 4px;font-size:20px;color:#111;">BGBCamp — Tasks</h1>
    <p style="margin:0;font-size:13px;color:#666;">${tasks.length} task${tasks.length === 1 ? "" : "s"} waiting for you this week</p>
    ${sections}
    <p style="margin:24px 0 0;font-size:13px;"><a href="${appUrl}/my-tasks" style="color:#0b6bcb;">Open My Tasks</a></p>
  </div>
</div>`;

      const text = [
        "BGBCamp — Tasks",
        "",
        ...Array.from(byProject.entries()).flatMap(([projectName, list]) => [
          projectName,
          ...list.map(
            (task) =>
              `- ${task.title}${task.due_date ? ` (due ${format(parseISO(task.due_date), "MMM d")})` : ""}`
          ),
          "",
        ]),
        `My Tasks: ${appUrl}/my-tasks`,
      ].join("\n");

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [person.email],
          subject: `BGBCamp — ${tasks.length} task${tasks.length === 1 ? "" : "s"} waiting for you`,
          html,
          text,
        }),
      });
      if (!res.ok) {
        console.error("weekly digest failed for", displayName(person), res.status, await res.text());
        continue;
      }
      sent += 1;
    } catch (err) {
      console.error("weekly digest failed for", person.email, err);
    }
  }

  return Response.json({ ok: true, sent });
}
