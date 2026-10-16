import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { CHANGELOG } from "@/lib/changelog";

export const metadata = {
  title: "Changelog · BGBCamp",
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Changelog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What&apos;s new in BGBCamp, newest first.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {CHANGELOG.map((entry) => (
          <Card key={entry.date + entry.title} className="flex flex-col gap-2 p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-semibold">{entry.title}</h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {format(parseISO(entry.date), "MMMM d, yyyy")}
              </span>
            </div>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-foreground/90">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
