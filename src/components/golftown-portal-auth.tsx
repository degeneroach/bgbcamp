"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { portalSignIn, portalSignOut } from "@/app/(golftown)/golftown/actions";

export function PortalLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await portalSignIn(username, password);
      if (!result.ok) {
        setError(result.error ?? "Incorrect username or password");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[380px] rounded-xl border bg-card p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandMark className="h-10 w-10" />
          <h1 className="mt-2 text-lg font-semibold">Golf Town Order Portal</h1>
          <p className="text-[13px] text-muted-foreground">
            Sign in to submit and track print orders.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gt-user" className="text-xs text-muted-foreground">
              Username
            </Label>
            <Input
              id="gt-user"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gt-pass" className="text-xs text-muted-foreground">
              Password
            </Label>
            <Input
              id="gt-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-full" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

export function PortalSignOut() {
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await portalSignOut();
          router.refresh();
        })
      }
      className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
