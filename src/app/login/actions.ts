"use server";

import { createClient } from "@/lib/supabase/server";

export interface SendMagicLinkResult {
  ok: boolean;
  error?: string;
}

export async function sendMagicLink(
  email: string,
  next: string
): Promise<SendMagicLinkResult> {
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    const supabase = await createClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    // Surface the real cause (e.g. a misconfigured Supabase URL/key) instead
    // of letting it throw uncaught, which shows the client a generic
    // "This page couldn't load" with no diagnostic information.
    console.error("sendMagicLink failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Could not reach Supabase: ${message}` };
  }
}
