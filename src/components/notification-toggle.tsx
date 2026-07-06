"use client";

import { useOptimistic, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff } from "lucide-react";
import { toggleProjectNotifications } from "@/app/(app)/projects/[slug]/actions";

export function NotificationToggle({
  projectId,
  projectSlug,
  initialEnabled,
}: {
  projectId: string;
  projectSlug: string;
  initialEnabled: boolean;
}) {
  const [, startTransition] = useTransition();
  const [enabled, setEnabled] = useOptimistic(initialEnabled);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      <Switch
        checked={enabled}
        onCheckedChange={(checked) => {
          startTransition(async () => {
            setEnabled(checked);
            await toggleProjectNotifications(projectId, projectSlug, checked);
          });
        }}
        aria-label="Toggle notifications for this project"
      />
    </div>
  );
}
