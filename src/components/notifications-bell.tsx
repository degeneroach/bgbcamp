"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, AtSign, Zap } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { notificationHref, type NotificationWithRelations } from "@/lib/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";

function NotificationsDropdown({
  notifications,
  unreadCount,
  title,
  emptyText,
  scope,
  triggerIcon,
  triggerClassName,
}: {
  notifications: NotificationWithRelations[];
  unreadCount: number;
  title: string;
  emptyText: string;
  scope: "mentions" | "boosts";
  triggerIcon: React.ReactNode;
  triggerClassName?: string;
}) {
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleOpenNotification(notification: NotificationWithRelations) {
    if (!notification.read) {
      startTransition(() => {
        markNotificationRead(notification.id);
      });
    }
    setOpen(false);
    router.push(notificationHref(notification));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className={cn("relative h-9 w-9", triggerClassName)} />
        }
      >
        {triggerIcon}
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{title}</span>
          <span className="flex items-center gap-3">
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline"
            >
              Your activity
            </Link>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  startTransition(() => {
                    markAllNotificationsRead(scope);
                  });
                }}
              >
                Mark all read
              </button>
            )}
          </span>
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notificationHref(notification)}
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenNotification(notification);
                  }}
                  className={cn(
                    "flex items-start gap-2 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/50",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <UserAvatar
                    name={notification.actor?.full_name}
                    email={notification.actor?.email ?? ""}
                    avatarUrl={notification.actor?.avatar_url}
                    className="mt-0.5 h-6 w-6"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-xs">
                      {notification.entity_type === "boost" ? (
                        <Zap className="h-3 w-3 text-amber-500" />
                      ) : (
                        <AtSign className="h-3 w-3 text-primary" />
                      )}
                      <span className="font-medium">
                        {displayName(notification.actor)}
                      </span>
                      <span className="text-muted-foreground">
                        {notification.entity_type === "boost" ? "boosted you" : "mentioned you"}
                      </span>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {notification.excerpt || "(no preview)"}
                    </span>
                    <span className="text-[11px] text-muted-foreground/70">
                      {notification.project?.name} · {timeAgo(notification.created_at)}
                    </span>
                  </div>
                  {!notification.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationsBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationWithRelations[];
  unreadCount: number;
}) {
  return (
    <NotificationsDropdown
      notifications={notifications}
      unreadCount={unreadCount}
      title="Mentions"
      emptyText="No mentions yet."
      scope="mentions"
      triggerIcon={<Bell className="h-4 w-4" />}
    />
  );
}

// Only rendered when the user has boost notifications — a quiet spot of
// delight rather than a permanent fixture (see AppShell).
export function BoostsBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationWithRelations[];
  unreadCount: number;
}) {
  return (
    <NotificationsDropdown
      notifications={notifications}
      unreadCount={unreadCount}
      title="Boosts"
      emptyText="No boosts yet."
      scope="boosts"
      triggerIcon={<Zap className="h-4 w-4 text-amber-500" />}
    />
  );
}
