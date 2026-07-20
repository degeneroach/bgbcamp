"use client";

import { useMemo, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { getUserAccent } from "@/lib/user-colors";
import { displayName } from "@/lib/display-name";
import { cn } from "@/lib/utils";
import { Users, Flame, Star } from "lucide-react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { Profile } from "@/types/database";

export interface ContributionEvent {
  actor_id: string | null;
  created_at: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function heatStyle(count: number, max: number, hue: string): React.CSSProperties {
  if (count === 0 || max === 0) return {};
  // Four GitHub-style intensity steps toward the person's accent color.
  const ratio = count / max;
  const pct = ratio > 0.75 ? 88 : ratio > 0.5 ? 62 : ratio > 0.25 ? 40 : 22;
  return { backgroundColor: `color-mix(in oklab, ${hue} ${pct}%, var(--muted))` };
}

export function ContributionCalendar({
  members,
  events,
}: {
  members: Profile[];
  events: ContributionEvent[];
}) {
  const [selected, setSelected] = useState<string>("all");

  const hue =
    selected === "all"
      ? "var(--primary)"
      : getUserAccent(members.find((m) => m.id === selected)?.email ?? null).bar;

  // day key (yyyy-MM-dd) -> count, for the current selection.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      if (selected !== "all" && event.actor_id !== selected) continue;
      const key = format(new Date(event.created_at), "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events, selected]);

  const today = startOfDay(new Date());
  const stats = useMemo(() => {
    let total = 0;
    let best: { key: string; count: number } | null = null;
    for (const [key, count] of counts) {
      total += count;
      if (!best || count > best.count) best = { key, count };
    }
    // Current streak: consecutive days ending today (or yesterday, so an
    // early-morning check doesn't read as a broken streak).
    let streak = 0;
    let cursor = today;
    if (!counts.has(format(cursor, "yyyy-MM-dd"))) cursor = addDays(cursor, -1);
    while (counts.has(format(cursor, "yyyy-MM-dd"))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return { total, activeDays: counts.size, best, streak };
  }, [counts, today]);

  const max = useMemo(() => Math.max(0, ...counts.values()), [counts]);
  const bestKey = stats.best?.key;

  // Three months: two back through the current one.
  const months = [subMonths(startOfMonth(today), 2), subMonths(startOfMonth(today), 1), startOfMonth(today)];

  return (
    <div className="flex flex-col gap-5">
      {/* Person chips — everyone plus each teammate in their accent color. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelected("all")}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
            selected === "all"
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Everyone
        </button>
        {members.map((member) => {
          const accent = getUserAccent(member.email);
          const active = selected === member.id;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelected(member.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors",
                active ? "font-medium" : "text-muted-foreground hover:bg-muted"
              )}
              style={
                active
                  ? {
                      borderColor: accent.bar,
                      backgroundColor: accent.tint,
                      color: accent.text,
                    }
                  : undefined
              }
            >
              <UserAvatar
                name={member.full_name}
                email={member.email}
                avatarUrl={member.avatar_url}
                className="h-6 w-6"
              />
              {displayName(member).split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="flex flex-col gap-0.5 p-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Contributions · 90d
          </span>
          <span className="text-xl font-semibold" style={{ color: hue }}>
            {stats.total}
          </span>
        </Card>
        <Card className="flex flex-col gap-0.5 p-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Active days</span>
          <span className="text-xl font-semibold">{stats.activeDays}</span>
        </Card>
        <Card className="flex flex-col gap-0.5 p-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Best day</span>
          <span className="text-xl font-semibold">
            {stats.best ? (
              <>
                {stats.best.count}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {format(new Date(`${stats.best.key}T12:00:00`), "MMM d")}
                </span>
              </>
            ) : (
              "—"
            )}
          </span>
        </Card>
        <Card className="flex flex-col gap-0.5 p-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Streak</span>
          <span className="flex items-center gap-1 text-xl font-semibold">
            {stats.streak}
            {stats.streak >= 3 && <Flame className="h-4 w-4 text-amber-500" />}
          </span>
        </Card>
      </div>

      {/* Month grids */}
      {months.map((monthStart) => {
        const monthKey = format(monthStart, "yyyy-MM");
        const daysInMonth = differenceInCalendarDays(
          startOfMonth(addDays(monthStart, 35)),
          monthStart
        );
        const leadingBlanks = monthStart.getDay();
        const monthTotal = Array.from(counts.entries())
          .filter(([key]) => key.startsWith(monthKey))
          .reduce((sum, [, c]) => sum + c, 0);

        return (
          <Card key={monthKey} className="p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                {format(monthStart, "MMMM yyyy")}
              </h2>
              <span className="text-xs text-muted-foreground">
                In range: <span className="font-semibold" style={{ color: hue }}>{monthTotal}</span>
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {day}
                </span>
              ))}
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = addDays(monthStart, i);
                const key = format(date, "yyyy-MM-dd");
                const count = counts.get(key) ?? 0;
                const isFuture = date > today;
                const isPeak = key === bestKey && count > 0;
                return (
                  <div
                    key={key}
                    title={`${format(date, "MMM d")}: ${count} contribution${count === 1 ? "" : "s"}`}
                    style={heatStyle(count, max, hue)}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-md border border-border/40 text-center sm:aspect-[4/3]",
                      isFuture && "border-dashed opacity-40",
                      count === 0 && !isFuture && "bg-muted/30",
                      isPeak && "ring-2 ring-amber-400"
                    )}
                  >
                    <span className="text-[10px] leading-none text-muted-foreground">
                      {format(date, "d")}
                      {isPeak && <Star className="ml-0.5 inline h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
                    </span>
                    {count > 0 && (
                      <span className="mt-0.5 text-xs font-semibold leading-none">{count}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        Low
        <div className="flex gap-1">
          {[22, 40, 62, 88].map((pct) => (
            <span
              key={pct}
              className="h-3 w-6 rounded-sm"
              style={{ backgroundColor: `color-mix(in oklab, ${hue} ${pct}%, var(--muted))` }}
            />
          ))}
        </div>
        High · ★ peak day · comments, tasks, boosts, and files all count
      </div>
    </div>
  );
}
