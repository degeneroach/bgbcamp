"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updateTask } from "@/app/(app)/projects/[slug]/tasks/actions";

export function TaskDueDatePicker({
  taskId,
  projectId,
  projectSlug,
  dueDate,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  dueDate: string | null;
}) {
  const [, startTransition] = useTransition();
  const selected = dueDate ? new Date(`${dueDate}T00:00:00`) : undefined;

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="h-8 w-full justify-start font-normal" />}>
        <CalendarIcon className="h-4 w-4" />
        {selected ? format(selected, "MMM d, yyyy") : "No due date"}
        {selected && (
          <X
            className="ml-auto h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              startTransition(() => {
                updateTask(taskId, projectId, projectSlug, { dueDate: null });
              });
            }}
          />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            startTransition(() => {
              updateTask(taskId, projectId, projectSlug, {
                dueDate: date ? format(date, "yyyy-MM-dd") : null,
              });
            });
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
