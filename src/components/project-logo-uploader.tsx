"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateProjectLogo } from "@/app/(app)/projects/[slug]/actions";
import { Loader2, Upload, X } from "lucide-react";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function ProjectLogoUploader({
  projectId,
  projectSlug,
  projectName,
  color,
  logoUrl,
}: {
  projectId: string;
  projectSlug: string;
  projectName: string;
  color: string;
  logoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Images must be under 5MB.");
      return;
    }

    setError(null);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    startTransition(async () => {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${projectId}/logo-${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

      const { error: uploadError } = await supabase.storage.from("attachments").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        setPreview(logoUrl);
        return;
      }

      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      const result = await updateProjectLogo(projectId, projectSlug, data.publicUrl);
      if (!result.ok) {
        setError(result.error ?? "Could not save the logo.");
        setPreview(logoUrl);
      } else {
        setPreview(data.publicUrl);
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await updateProjectLogo(projectId, projectSlug, null);
      if (!result.ok) {
        setError(result.error ?? "Could not remove the logo.");
        return;
      }
      setPreview(null);
    });
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={`${projectName} logo`}
          className="h-16 w-16 shrink-0 rounded-xl border object-cover"
        />
      ) : (
        <span
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-xl font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {projectName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {preview ? "Change logo" : "Upload logo"}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove}>
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Square works best — it replaces the colored initial everywhere. Max 5MB.
        </p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
