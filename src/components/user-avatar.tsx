import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getUserAccent } from "@/lib/user-colors";
import { displayInitials, displayName } from "@/lib/display-name";

export function UserAvatar({
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
  const person = { full_name: name, email };
  // Subtle, consistent per-person tint on the initials fallback.
  const accent = getUserAccent(email || name);

  return (
    <Avatar className={cn("h-7 w-7", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName(person)} />}
      <AvatarFallback
        className="text-[11px] font-semibold"
        style={{ backgroundColor: accent.tint, color: accent.text }}
      >
        {displayInitials(person)}
      </AvatarFallback>
    </Avatar>
  );
}
