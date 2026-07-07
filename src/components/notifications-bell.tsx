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
import { Bell, AtSign } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { displayName } from "@/lib/display-name";
import { notificationHref, type NotificationWithRelations } from "@/lib/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";

export function NotificationsBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationWithRelations[];
  unreadCount: number;
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
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative h-9 w-9" />}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Mentions</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={(e) => {
                e.preventDefault();
                startTransition(() => {
                  markAllNotificationsRead();
                });
              }}
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No mentions yet.
            </p>
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
                      <AtSign className="h-3 w-3 text-primary" />
                      <span className="font-medium">
                        {displayName(notification.actor)}
                      </span>
                      <span className="text-muted-foreground">mentioned you</span>
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
