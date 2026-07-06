import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommentCountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      <MessageSquare className="h-3 w-3" />
      {count}
    </span>
  );
}
