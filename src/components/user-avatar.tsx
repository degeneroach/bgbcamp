import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

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
  return (
    <Avatar className={cn("h-7 w-7", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? email} />}
      <AvatarFallback className="text-[11px] font-medium">
        {initials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
