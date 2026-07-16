"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { recordTaskImage, deleteTaskImage } from "@/app/(app)/projects/[slug]/tasks/actions";
import { useImageLightbox } from "@/components/image-lightbox";
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
  const [dragOver, setDragOver] = useState(false);
  const lightbox = useImageLightbox();

  function uploadImages(all: File[]) {
    const images = all.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Only image files are supported here — drop other files on the Files section.");
      return;
    }
    if (images.some((f) => f.size > MAX_SIZE_BYTES)) {
      setError("Images must be under 8MB.");
      return;
    }

    setError(null);
    startUpload(async () => {
      const supabase = createClient();
      for (const file of images) {
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
          return;
        }
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length > 0) uploadImages(files);
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg transition-shadow ${dragOver ? "ring-2 ring-primary/40" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        uploadImages(Array.from(e.dataTransfer.files));
      }}
    >
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
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {images.length === 0 && (
        <p className="text-xs text-muted-foreground/70">
          Drag &amp; drop images here, or click Upload image.
        </p>
      )}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-md border"
              onClick={() =>
                lightbox?.openGallery(
                  images.map((i) => ({ src: i.url, alt: "Task attachment" })),
                  index
                )
              }
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
    </div>
  );
}
