"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Loader2, Plus, Repeat, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  createRecurringTask,
  setRecurringTaskActive,
  deleteRecurringTask,
} from "@/app/(app)/projects/[slug]/tasks/recurring-actions";
import { displayName } from "@/lib/display-name";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Profile, RecurringTask } from "@/types/database";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function cadenceLabel(template: RecurringTask): string {
  return template.cadence === "weekly"
    ? `Every ${WEEKDAYS[template.cadence_day]}`
    : `Monthly on day ${template.cadence_day}`;
}

export function RecurringTasksManager({
  projectId,
  projectSlug,
  templates,
  lists,
  members,
}: {
  projectId: string;
  projectSlug: string;
  templates: RecurringTask[];
  lists: { id: string; name: string }[];
  members: Profile[];
}) {
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function toggleActive(template: RecurringTask, active: boolean) {
    startTransition(async () => {
      const result = await setRecurringTaskActive(template.id, projectSlug, active);
      if (!result.ok) toast.error(result.error ?? "Couldn't update.");
      router.refresh();
    });
  }

  function remove(template: RecurringTask) {
    if (!window.confirm(`Stop repeating "${template.title}"? Existing tasks stay.`)) return;
    startTransition(async () => {
      const result = await deleteRecurringTask(template.id, projectSlug);
      if (!result.ok) toast.error(result.error ?? "Couldn't delete.");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Repeat className="h-4 w-4" />
        Recurring
        {templates.filter((t) => t.active).length > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-primary">
            {templates.filter((t) => t.active).length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              Recurring tasks
            </DialogTitle>
          </DialogHeader>

          {templates.length === 0 && !composing && (
            <p className="py-2 text-sm italic text-muted-foreground">
              Nothing repeats yet — set up tasks that create themselves on a schedule.
            </p>
          )}

          {templates.length > 0 && (
            <div className="flex flex-col divide-y rounded-lg border">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className={cn("min-w-0 flex-1", !template.active && "opacity-50")}>
                    <p className="truncate text-sm font-medium">{template.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cadenceLabel(template)} · next{" "}
                      {format(parseISO(template.next_run), "MMM d")}
                      {template.assignee_ids.length > 0 &&
                        ` · ${template.assignee_ids
                          .map((id) => {
                            const person = members.find((m) => m.id === id);
                            return person ? displayName(person).split(" ")[0] : null;
                          })
                          .filter(Boolean)
                          .join(", ")}`}
                    </p>
                  </div>
                  <Switch
                    checked={template.active}
                    onCheckedChange={(checked) => toggleActive(template, checked === true)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(template)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Delete recurring task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {composing ? (
            <RecurringComposer
              projectId={projectId}
              projectSlug={projectSlug}
              lists={lists}
              members={members}
              onDone={() => {
                setComposing(false);
                router.refresh();
              }}
              onCancel={() => setComposing(false)}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setComposing(true)}
            >
              <Plus className="h-4 w-4" />
              New recurring task
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export interface RecurringInitial {
  title?: string;
  descriptionHtml?: string;
  listId?: string;
  assigneeIds?: string[];
}

export function RecurringComposer({
  projectId,
  projectSlug,
  lists,
  members,
  initial,
  onDone,
  onCancel,
}: {
  projectId: string;
  projectSlug: string;
  lists: { id: string; name: string }[];
  members: Profile[];
  /** Pre-fill (e.g. "Make recurring" from an existing task). */
  initial?: RecurringInitial;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.descriptionHtml ?? "");
  const [listId, setListId] = useState(initial?.listId ?? lists[0]?.id ?? "");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("monthly");
  const [cadenceDay, setCadenceDay] = useState("1");
  const [assignees, setAssignees] = useState<Set<string>>(
    new Set(initial?.assigneeIds ?? [])
  );
  const [isPending, startTransition] = useTransition();

  const listItems: Record<string, React.ReactNode> = Object.fromEntries(
    lists.map((l) => [l.id, l.name])
  );
  const cadenceItems: Record<string, React.ReactNode> = {
    monthly: "Monthly",
    weekly: "Weekly",
  };
  const dayItems: Record<string, React.ReactNode> =
    cadence === "weekly"
      ? Object.fromEntries(WEEKDAYS.map((d, i) => [String(i), d]))
      : Object.fromEntries(
          Array.from({ length: 28 }, (_, i) => [String(i + 1), `Day ${i + 1}`])
        );

  function toggleAssignee(id: string) {
    setAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createRecurringTask(projectSlug, {
        projectId,
        taskListId: listId,
        title,
        descriptionHtml: description,
        assigneeIds: Array.from(assignees),
        cadence,
        cadenceDay: parseInt(cadenceDay, 10),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't create the recurring task.");
        return;
      }
      toast.success("Recurring task scheduled.");
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 rounded-lg border p-3.5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rt-title" className="text-xs text-muted-foreground">
          Title — &#123;date&#125; becomes the occurrence date, e.g. &ldquo;Invoice (&#123;date&#125;)&rdquo;
        </Label>
        <Input
          id="rt-title"
          autoFocus
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Grab Claude Invoice ({date})"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Repeats</Label>
          <Select
            items={cadenceItems}
            value={cadence}
            onValueChange={(v) => {
              if (!v) return;
              setCadence(v as "weekly" | "monthly");
              setCadenceDay(v === "weekly" ? "1" : "1");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {cadence === "weekly" ? "On" : "On day"}
          </Label>
          <Select items={dayItems} value={cadenceDay} onValueChange={(v) => v && setCadenceDay(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              {Object.entries(dayItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">List</Label>
        <Select items={listItems} value={listId} onValueChange={(v) => v && setListId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {lists.map((list) => (
              <SelectItem key={list.id} value={list.id}>
                {list.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Assign to</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {members.map((person) => (
            <label key={person.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
              <Checkbox
                checked={assignees.has(person.id)}
                onCheckedChange={() => toggleAssignee(person.id)}
              />
              {displayName(person)}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Description (optional)</Label>
        <RichTextEditor
          content={description}
          onChange={setDescription}
          placeholder="Instructions, links..."
          minHeight="4rem"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" size="sm" className="rounded-full" disabled={isPending || !listId}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Schedule it
        </Button>
      </div>
    </form>
  );
}
