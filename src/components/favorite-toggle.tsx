"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleProjectFavorite } from "@/app/(app)/projects/actions";
import { cn } from "@/lib/utils";

export function FavoriteToggle({
  projectId,
  initialFavorited,
}: {
  projectId: string;
  initialFavorited: boolean;
}) {
  const [favorited, setOptimistic] = useOptimistic(initialFavorited);
  const [, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      setOptimistic(!favorited);
      await toggleProjectFavorite(projectId, !favorited);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={toggle}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "h-4 w-4",
          favorited ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
        )}
      />
    </Button>
  );
}
