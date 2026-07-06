import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isBefore, isToday, startOfDay } from "date-fns";

export function DueDateBadge({
  dueDate,
  completed,
  className,
}: {
  dueDate: string | null;
  completed?: boolean;
  className?: string;
}) {
  if (!dueDate) return null;

  const date = new Date(`${dueDate}T00:00:00`);
  const overdue = !completed && isBefore(date, startOfDay(new Date())) && !isToday(date);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        overdue ? "font-medium text-destructive" : "text-muted-foreground",
        className
      )}
    >
      <CalendarClock className="h-3 w-3" />
      {format(date, "MMM d")}
    </span>
  );
}
