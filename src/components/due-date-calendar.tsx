"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMonths,
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { createCalendarEvent, deleteCalendarEvent } from "@/app/(app)/calendar/actions";
import { displayName } from "@/lib/display-name";
import { isTaskCompleted } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CalendarEvent, Profile, Project, Task } from "@/types/database";

export interface CalendarTask extends Task {
  assignees: Profile[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "Add to Google Calendar" template link: all-day events span one day;
// timed events default to one hour.
function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title });
  const day = event.event_date.replace(/-/g, "");
  if (event.start_time) {
    const [h, m] = event.start_time.split(":").map(Number);
    const pad = (n: number) => String(n).padStart(2, "0");
    const start = `${day}T${pad(h)}${pad(m)}00`;
    const endH = (h + 1) % 24;
    params.set("dates", `${start}/${day}T${pad(endH)}${pad(m)}00`);
  } else {
    const next = format(addDays(parseISO(event.event_date), 1), "yyyyMMdd");
    params.set("dates", `${day}/${next}`);
  }
  if (event.notes) params.set("details", event.notes);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

export function DueDateCalendar({
  monthISO,
  tasks,
  events,
  projects,
  members,
  currentUserId,
}: {
  monthISO: string;
  tasks: CalendarTask[];
  events: CalendarEvent[];
  projects: Project[];
  members: Profile[];
  currentUserId: string;
}) {
  const month = parseISO(monthISO);
  const [enabledProjects, setEnabledProjects] = useState<Set<string>>(
    () => new Set(projects.map((p) => p.id))
  );
  const [showEvents, setShowEvents] = useState(true);
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    const list: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) list.push(d);
    return list;
  }, [month]);

  const visibleTasks = tasks.filter((t) => enabledProjects.has(t.project_id));

  function toggleProject(projectId: string) {
    setEnabledProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  const prevHref = `/calendar?m=${format(addMonths(month, -1), "yyyy-MM")}`;
  const nextHref = `/calendar?m=${format(addMonths(month, 1), "yyyy-MM")}`;
  const today = new Date();

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Sidebar: project filters + event toggle + new event */}
      <Card className="flex flex-col gap-4 p-4 lg:sticky lg:top-20">
        <Button size="sm" className="rounded-full" onClick={() => setComposerOpen(true)}>
          <CalendarPlus className="h-4 w-4" />
          Add event
        </Button>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Projects
          </p>
          {projects.map((project) => (
            <label
              key={project.id}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={enabledProjects.has(project.id)}
                onCheckedChange={() => toggleProject(project.id)}
              />
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
                aria-hidden
              />
              <span className="min-w-0 truncate">{project.name}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={showEvents} onCheckedChange={() => setShowEvents((v) => !v)} />
            <Users className="h-3.5 w-3.5 text-primary" />
            Company events
          </label>
        </div>
      </Card>

      {/* Month grid */}
      <Card className="flex flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{format(month, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" render={<Link href="/calendar" />}>
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" render={<Link href={prevHref} />} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" render={<Link href={nextHref} />} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayISO = format(day, "yyyy-MM-dd");
            const dayTasks = visibleTasks.filter((t) => t.due_date === dayISO);
            const dayEvents = showEvents ? events.filter((e) => e.event_date === dayISO) : [];
            const inMonth = isSameMonth(day, month);
            return (
              <div
                key={dayISO}
                className={cn(
                  "flex min-h-24 flex-col gap-1 border-b border-r p-1.5 first:border-l [&:nth-child(7n+1)]:border-l",
                  !inMonth && "bg-muted/30"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums",
                    isSameDay(day, today)
                      ? "bg-primary font-semibold text-primary-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/60"
                  )}
                >
                  {format(day, "d")}
                </span>

                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setOpenEvent(event)}
                    className="flex w-full items-center gap-1 rounded bg-primary/15 px-1.5 py-1 text-left text-[11px] font-medium leading-tight text-primary hover:bg-primary/25"
                  >
                    <Users className="h-3 w-3 shrink-0" />
                    <span className="min-w-0 truncate">
                      {event.start_time ? `${formatTime(event.start_time)} · ` : ""}
                      {event.title}
                    </span>
                  </button>
                ))}

                {dayTasks.map((task) => {
                  const project = projectById.get(task.project_id);
                  return (
                    <Link
                      key={task.id}
                      href={project ? `/projects/${project.slug}/tasks/${task.id}` : "#"}
                      className={cn(
                        "flex w-full items-center gap-1 rounded bg-foreground/[0.04] px-1.5 py-1 text-[11px] leading-tight hover:bg-foreground/[0.09] dark:bg-white/[0.06] dark:hover:bg-white/[0.12]",
                        isTaskCompleted(task) && "opacity-50 line-through"
                      )}
                      title={`${task.title}${project ? ` · ${project.name}` : ""}`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: project?.color ?? "#94a3b8" }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      {task.assignees.slice(0, 2).map((a) => (
                        <UserAvatar
                          key={a.id}
                          name={a.full_name}
                          email={a.email}
                          avatarUrl={a.avatar_url}
                          className="h-4 w-4 shrink-0 text-[7px]"
                        />
                      ))}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      {openEvent && (
        <EventDetails
          event={openEvent}
          memberById={memberById}
          currentUserId={currentUserId}
          onClose={() => setOpenEvent(null)}
        />
      )}

      <EventComposer open={composerOpen} onOpenChange={setComposerOpen} members={members} />
    </div>
  );
}

function EventDetails({
  event,
  memberById,
  currentUserId,
  onClose,
}: {
  event: CalendarEvent;
  memberById: Map<string, Profile>;
  currentUserId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const attendees = event.attendee_ids
    .map((id) => memberById.get(id))
    .filter((p): p is Profile => Boolean(p));

  function handleDelete() {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteCalendarEvent(event.id);
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete the event.");
        return;
      }
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {event.title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {format(parseISO(event.event_date), "EEEE, MMMM d")}
            {event.start_time && ` · ${formatTime(event.start_time)}`}
          </p>
          {attendees.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {attendees.map((person) => (
                <span
                  key={person.id}
                  className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  <UserAvatar
                    name={person.full_name}
                    email={person.email}
                    avatarUrl={person.avatar_url}
                    className="h-4 w-4 text-[7px]"
                  />
                  {displayName(person)}
                </span>
              ))}
            </div>
          )}
          {event.notes && <p className="whitespace-pre-wrap">{event.notes}</p>}
          <div className="flex items-center justify-between border-t pt-3">
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Add to Google Calendar
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {event.created_by === currentUserId && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                disabled={isPending}
                aria-label="Delete event"
                className="text-muted-foreground hover:text-destructive"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventComposer({
  open,
  onOpenChange,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Profile[];
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleAttendee(id: string) {
    setAttendees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCalendarEvent({
        title,
        date,
        startTime: time || null,
        attendeeIds: Array.from(attendees),
        notes,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not create the event.");
        return;
      }
      toast.success("Event added — attendees have been notified.");
      setTitle("");
      setDate("");
      setTime("");
      setNotes("");
      setAttendees(new Set());
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-title" className="text-xs text-muted-foreground">
              Title
            </Label>
            <Input
              id="ev-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Company-wide meeting"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-date" className="text-xs text-muted-foreground">
                Date
              </Label>
              <Input
                id="ev-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-time" className="text-xs text-muted-foreground">
                Time (optional)
              </Label>
              <Input
                id="ev-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Attendees</Label>
            <div className="flex flex-col gap-1.5">
              {members.map((person) => (
                <label key={person.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={attendees.has(person.id)}
                    onCheckedChange={() => toggleAttendee(person.id)}
                  />
                  <UserAvatar
                    name={person.full_name}
                    email={person.email}
                    avatarUrl={person.avatar_url}
                    className="h-5 w-5 text-[8px]"
                  />
                  {displayName(person)}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Attendees get a notification with an &ldquo;Add to Google Calendar&rdquo; link.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-notes" className="text-xs text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              id="ev-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Agenda, location, video link..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" size="sm" className="rounded-full" disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
