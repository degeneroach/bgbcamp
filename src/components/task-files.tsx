"use client";

import { useRef, useState, useTransition } from "react";
import {
  Paperclip,
  Loader2,
  X,
  Download,
  FileText,
  FileArchive,
  FileImage,
  FileType,
  File as FileIcon,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { recordTaskFile, deleteTaskFile } from "@/app/(app)/projects/[slug]/tasks/actions";
import { useImageLightbox } from "@/components/image-lightbox";
import type { TaskFile } from "@/types/database";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

function formatBytes(bytes: number | null): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function iconFor(name: string, mime: string | null) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime?.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return FileImage;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (["ai", "psd", "eps", "sketch", "fig", "xd"].includes(ext)) return FileType;
  if (["pdf", "doc", "docx", "txt", "rtf", "md"].includes(ext)) return FileText;
  return FileIcon;
}

export function TaskFiles({
  taskId,
  projectId,
  projectSlug,
  taskTitle,
  files,
}: {
  taskId: string;
  projectId: string;
  projectSlug: string;
  taskTitle: string;
  files: TaskFile[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUpload] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const lightbox = useImageLightbox();

  function uploadFiles(all: File[]) {
    if (all.length === 0) return;
    if (all.some((f) => f.size > MAX_SIZE_BYTES)) {
      setError("Files must be under 50MB.");
      return;
    }

    setError(null);
    startUpload(async () => {
      const supabase = createClient();
      for (const file of all) {
        const ext = file.name.split(".").pop();
        const path = `${projectId}/${taskId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const { data } = supabase.storage.from("attachments").getPublicUrl(path);
        const result = await recordTaskFile(taskId, projectId, projectSlug, taskTitle, {
          storagePath: path,
          url: data.publicUrl,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
        if (!result.ok) {
          setError(result.error ?? "Could not save file.");
          return;
        }
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    uploadFiles(files);
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
        uploadFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Files</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
          Add file
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {files.length === 0 && (
        <p className="text-xs text-muted-foreground/70">
          Drag &amp; drop any files here (PDF, .ai, vectors, videos…), or click Add file.
        </p>
      )}
      {files.length > 0 && (
        <ul className="flex flex-col divide-y rounded-md border">
          {files.map((file) => {
            const Icon = iconFor(file.name, file.mime_type);
            const isImage = file.mime_type?.startsWith("image/");
            const isVideo = file.mime_type?.startsWith("video/");
            const openPreview = isImage
              ? () => lightbox?.open(file.url, file.name, "image")
              : isVideo
                ? () => lightbox?.open(file.url, file.name, "video")
                : undefined;
            return (
              <li key={file.id} className="group flex items-center gap-3 px-3 py-2">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.url}
                    alt={file.name}
                    onClick={openPreview}
                    className="h-10 w-10 shrink-0 cursor-zoom-in rounded-md border object-cover"
                  />
                ) : isVideo ? (
                  <button
                    type="button"
                    onClick={openPreview}
                    className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-md border bg-black"
                    aria-label={`Play ${file.name}`}
                  >
                    {/* #t=0.1 nudges browsers to render the first frame as a poster. */}
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={`${file.url}#t=0.1`}
                      preload="metadata"
                      muted
                      playsInline
                      tabIndex={-1}
                      className="pointer-events-none h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Play className="h-4 w-4 fill-white text-white" />
                    </span>
                  </button>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`truncate text-sm font-medium ${openPreview ? "cursor-pointer hover:underline" : ""}`}
                    onClick={openPreview}
                  >
                    {file.name}
                  </span>
                  {file.size_bytes != null && (
                    <span className="text-xs text-muted-foreground">{formatBytes(file.size_bytes)}</span>
                  )}
                </div>
                <a
                  href={file.url}
                  download={file.name}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Download ${file.name}`}
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100 disabled:opacity-50"
                  disabled={isDeleting}
                  onClick={() =>
                    startDelete(() => {
                      deleteTaskFile(file.id, file.storage_path, projectSlug, taskId);
                    })
                  }
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
