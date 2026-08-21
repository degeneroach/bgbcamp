"use client";

import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { displayName } from "@/lib/display-name";

// Clicking the avatar pops a compact 150x150 preview of the photo right
// beside it — quicker than the full lightbox for "who is that?". Renders a
// plain avatar when there's no photo to show.
export function EnlargeableAvatar({
  name,
  email,
  avatarUrl,
  className,
}: {
  name: string | null | undefined;
  email: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!avatarUrl) {
    return <UserAvatar name={name} email={email} avatarUrl={avatarUrl} className={className} />;
  }

  const label = displayName({ full_name: name, email });

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="cursor-zoom-in rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`View ${label}'s photo`}
      >
        <UserAvatar name={name} email={email} avatarUrl={avatarUrl} className={className} />
      </button>
      {open && (
        <span className="absolute left-0 top-full z-50 mt-2 flex w-max flex-col items-center gap-1.5 rounded-xl border bg-popover p-2 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={label}
            className="h-[150px] w-[150px] rounded-lg object-cover"
          />
          <span className="text-xs font-medium text-popover-foreground">{label}</span>
        </span>
      )}
    </span>
  );
}
