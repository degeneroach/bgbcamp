"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/app/(app)/projects/actions";

export function FavoriteButton({
  projectId,
  initialFavorite,
}: {
  projectId: string;
  initialFavorite: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(initialFavorite);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          setOptimisticFavorite(!optimisticFavorite);
          await toggleFavorite(projectId, optimisticFavorite);
        });
      }}
      aria-label={optimisticFavorite ? "Unfavorite project" : "Favorite project"}
    >
      <Star
        className={cn(
          "h-4 w-4",
          optimisticFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
        )}
      />
    </Button>
  );
}
