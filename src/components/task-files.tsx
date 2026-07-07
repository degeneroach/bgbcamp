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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { recordTaskFile, deleteTaskFile } from "@/app/(app)/projects/[slug]/tasks/actions";
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      setError("Files must be under 50MB.");
      return;
    }

    setError(null);
    startUpload(async () => {
      const supabase = createClient();
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
      if (!result.ok) setError(result.error ?? "Could not save file.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
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
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {files.length > 0 && (
        <ul className="flex flex-col divide-y rounded-md border">
          {files.map((file) => {
            const Icon = iconFor(file.name, file.mime_type);
            return (
              <li key={file.id} className="group flex items-center gap-3 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{file.name}</span>
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
