"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          That didn&apos;t load correctly — usually a momentary hiccup. Try again.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    </div>
  );
}
