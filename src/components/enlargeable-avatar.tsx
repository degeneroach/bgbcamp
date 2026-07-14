"use client";

import { UserAvatar } from "@/components/user-avatar";
import { useImageLightbox } from "@/components/image-lightbox";
import { displayName } from "@/lib/display-name";

// A UserAvatar that opens the full-size photo in the lightbox when clicked.
// Renders a plain avatar when there's no photo to enlarge.
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
  const lightbox = useImageLightbox();

  if (!avatarUrl || !lightbox) {
    return <UserAvatar name={name} email={email} avatarUrl={avatarUrl} className={className} />;
  }

  return (
    <button
      type="button"
      onClick={() => lightbox.open(avatarUrl, displayName({ full_name: name, email }), "image")}
      className="cursor-zoom-in rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View ${displayName({ full_name: name, email })}'s photo`}
    >
      <UserAvatar name={name} email={email} avatarUrl={avatarUrl} className={className} />
    </button>
  );
}
