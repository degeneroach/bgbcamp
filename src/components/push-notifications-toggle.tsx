"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import {
  savePushSubscription,
  removePushSubscription,
} from "@/app/(app)/notifications/actions";

type Status =
  | "loading"
  | "unsupported"
  | "denied"
  | "off"
  | "on";

// Tolerate paste artifacts in the env value (quotes, backticks, whitespace).
function vapidPublicKey(): string {
  return (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim().replace(/^["'`]+|["'`]+$/g, "");
}

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  // TS 5.7 types Uint8Array over ArrayBufferLike, which no longer satisfies
  // BufferSource — the runtime value is a plain ArrayBuffer-backed view.
  return Uint8Array.from(raw, (c) => c.charCodeAt(0)) as BufferSource;
}

// Enables Chrome/system push notifications for mentions and boosts on this
// browser. Each browser subscribes separately (work laptop vs. home PC).
export function PushNotificationsToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function init() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        setStatus(subscription ? "on" : "off");
      } catch {
        setStatus("off");
      }
    }
    void init();
  }, []);

  function enable() {
    setError(null);
    const key = vapidPublicKey();
    if (!key) {
      setError(
        "Push isn't configured on this deployment yet — add the VAPID keys in Vercel and redeploy."
      );
      return;
    }
    // A valid VAPID public key is 87 base64url chars (65 bytes). Catch
    // swapped/truncated values with a clearer message than Chrome's.
    if (key.length !== 87) {
      setError(
        `The configured VAPID public key looks wrong (${key.length} chars, expected 87) — check NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel isn't swapped with the private key or truncated, then redeploy.`
      );
      return;
    }
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
        const json = subscription.toJSON();
        await savePushSubscription({
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        });
        setStatus("on");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not enable notifications.");
      }
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setStatus("off");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not disable notifications.");
      }
    });
  }

  if (status === "loading") {
    return <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" aria-hidden />;
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        This browser doesn&apos;t support push notifications.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Notifications are blocked for this site. Allow them in your browser&apos;s site
        settings (the lock icon in the address bar), then reload.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant={status === "on" ? "outline" : "default"}
          size="sm"
          disabled={isPending}
          onClick={status === "on" ? disable : enable}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : status === "on" ? (
            <BellOff className="h-3.5 w-3.5" />
          ) : (
            <BellRing className="h-3.5 w-3.5" />
          )}
          {status === "on" ? "Disable on this browser" : "Enable browser notifications"}
        </Button>
        {status === "on" && (
          <span className="text-xs font-medium text-success">Enabled on this browser</span>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Get a Chrome notification when someone mentions or boosts you — even when
        you&apos;re on another tab. Per browser: enable it on each computer you use.
      </p>
    </div>
  );
}
