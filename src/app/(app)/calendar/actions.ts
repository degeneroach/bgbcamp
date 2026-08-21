"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { sendPushToUsers } from "@/lib/push";
import { format, parseISO } from "date-fns";

interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createCalendarEvent(input: {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM or null for all-day
  attendeeIds: string[];
  notes: string;
}): Promise<ActionResult> {
  if (!input.title.trim()) return { ok: false, error: "Give the event a title." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Pick a date." };

  const { userId, organization, profile } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("calendar_events")
    .insert({
      organization_id: organization.id,
      title: input.title.trim(),
      notes: input.notes.trim(),
      event_date: input.date,
      start_time: input.startTime ? `${input.startTime}:00` : null,
      attendee_ids: input.attendeeIds,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Invite attendees (not the creator): bell notification + push. The
  // calendar page itself carries the "Add to Google Calendar" link.
  const recipients = Array.from(new Set(input.attendeeIds)).filter((id) => id !== userId);
  if (recipients.length > 0) {
    const day = format(parseISO(input.date), "EEE, MMM d");
    const when = input.startTime ? `${day} at ${input.startTime}` : day;
    await supabase.from("notifications").insert(
      recipients.map((recipientId) => ({
        organization_id: organization.id,
        recipient_id: recipientId,
        actor_id: userId,
        project_id: null,
        entity_type: "calendar_event" as const,
        entity_id: event.id,
        excerpt: `📅 “${input.title.trim()}” — ${when}`,
      }))
    );
    await sendPushToUsers(recipients, {
      title: `${profile.full_name ?? "A teammate"} invited you: ${input.title.trim()}`,
      body: `${when} — open the calendar to add it to Google Calendar.`,
      url: "/calendar",
      tag: `calendar-event-${event.id}`,
    });
  }

  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteCalendarEvent(eventId: string): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  return { ok: true };
}
