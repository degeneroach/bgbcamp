import { cn } from "@/lib/utils";

export function CommentCountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground",
        className
      )}
    >
      {count}
    </span>
  );
}
