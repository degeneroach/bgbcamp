"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import { updateWikiDoc } from "@/app/(app)/tools/wiki/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WikiDoc, WikiSection } from "@/types/database";

type SaveState = "idle" | "dirty" | "saving" | "saved";

export function WikiEditor({
  doc,
  sections,
  organizationId,
}: {
  doc: WikiDoc;
  sections: Pick<WikiSection, "id" | "name">[];
  organizationId: string;
}) {
  const [title, setTitle] = useState(doc.title === "Untitled" ? "" : doc.title);
  const [sectionId, setSectionId] = useState(doc.section_id);
  const [published, setPublished] = useState(doc.is_published);
  const [body, setBody] = useState(doc.body_html);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const latest = useRef({ title, sectionId, published, body });
  latest.current = { title, sectionId, published, body };

  async function persist(): Promise<boolean> {
    setSaveState("saving");
    const current = latest.current;
    const result = await updateWikiDoc(doc.id, {
      title: current.title,
      sectionId: current.sectionId,
      bodyHtml: current.body,
      isPublished: current.published,
    });
    if (!result.ok) {
      toast.error(result.error ?? "Could not save the doc.");
      setSaveState("dirty");
      return false;
    }
    setSaveState("saved");
    return true;
  }

  // Autosave after ~2s of inactivity once anything changes.
  useEffect(() => {
    const changed =
      title !== (doc.title === "Untitled" ? "" : doc.title) ||
      sectionId !== doc.section_id ||
      published !== doc.is_published ||
      body !== doc.body_html;
    if (!changed) return;
    setSaveState("dirty");
    const timeout = setTimeout(() => {
      void persist();
    }, 2000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, sectionId, published, body]);

  function handleSave() {
    startTransition(async () => {
      const ok = await persist();
      if (ok) router.push(`/tools/wiki/${doc.slug}`);
    });
  }

  const sectionItems: Record<string, React.ReactNode> = Object.fromEntries(
    sections.map((s) => [s.id, s.name])
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Section</Label>
            <Select items={sectionItems} value={sectionId} onValueChange={(v) => v && setSectionId(v)}>
              <SelectTrigger className="h-8 w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Published</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground transition-opacity",
              saveState === "idle" && "opacity-0"
            )}
          >
            {saveState === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check className="h-3 w-3 text-success" /> Saved
              </>
            )}
            {saveState === "dirty" && "Unsaved changes"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/tools/wiki/${doc.slug}`)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button size="sm" className="rounded-full" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled SOP"
        className="w-full border-0 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
      />

      <RichTextEditor
        content={body}
        onChange={setBody}
        placeholder="Write the SOP... (paste or drop images, videos, and files)"
        minHeight="55vh"
        projectId={organizationId}
        enableImages
      />
    </div>
  );
}
