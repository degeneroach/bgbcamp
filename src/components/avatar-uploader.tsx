"use client";

import { useRef, useState, useTransition } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateAvatar, removeAvatar } from "@/app/(app)/profile/actions";
import { Loader2, Upload, X } from "lucide-react";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function AvatarUploader({
  userId,
  name,
  email,
  avatarUrl,
}: {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
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
      const path = `${userId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        setPreview(avatarUrl);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const result = await updateAvatar(data.publicUrl);
      if (!result.ok) {
        setError(result.error ?? "Could not save your photo.");
        setPreview(avatarUrl);
      } else {
        setPreview(data.publicUrl);
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeAvatar();
      if (!result.ok) {
        setError(result.error ?? "Could not remove photo.");
        return;
      }
      setPreview(null);
    });
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={name} email={email} avatarUrl={preview} className="h-16 w-16 text-base" />
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
            Change photo
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove}>
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">JPG, PNG, or GIF. Max 5MB.</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
