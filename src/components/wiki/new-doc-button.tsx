"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { createWikiDoc } from "@/app/(app)/tools/wiki/actions";
import { toast } from "sonner";

export function NewDocButton({ sectionId }: { sectionId?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate() {
    startTransition(async () => {
      const result = await createWikiDoc(sectionId);
      if (!result.ok || !result.slug) {
        toast.error(result.error ?? "Could not create the doc.");
        return;
      }
      router.push(`/tools/wiki/${result.slug}/edit`);
    });
  }

  return (
    <Button size="sm" className="h-8 rounded-full" onClick={handleCreate} disabled={isPending}>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      New doc
    </Button>
  );
}
