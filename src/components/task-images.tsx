"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { recordTaskImage, deleteTaskImage } from "@/app/(app)/projects/[slug]/tasks/actions";
import type { TaskImage } from "@/types/database";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export function TaskImages({
  taskId,
  projectId,
  projectSlug,
  taskTitle,
  images,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  taskTitle: string;
  images: TaskImage[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUpload] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TaskImage | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Images must be under 8MB.");
      return;
    }

    setError(null);
    startUpload(async () => {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${projectId}/${taskId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

      const { error: uploadError } = await supabase.storage.from("task-images").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("task-images").getPublicUrl(path);
      const result = await recordTaskImage(taskId, projectId, projectSlug, taskTitle, path, data.publicUrl);
      if (!result.ok) {
        setError(result.error ?? "Could not save image.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Images</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          Upload image
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border"
              onClick={() => setPreview(image)}
            >
              <Image src={image.url} alt="Task attachment" fill sizes="200px" className="object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block disabled:opacity-50"
                disabled={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  startDelete(() => {
                    deleteTaskImage(image.id, image.storage_path, projectSlug, taskId);
                  });
                }}
                aria-label="Delete image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          onClick={() => setPreview(null)}
        >
          <div className="relative h-full w-full max-w-3xl">
            <Image src={preview.url} alt="Task attachment" fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
