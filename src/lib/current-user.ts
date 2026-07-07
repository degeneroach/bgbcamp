import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile, Role } from "@/types/database";

export interface CurrentUserContext {
  userId: string;
  profile: Profile;
  organization: Organization;
  role: Role;
}

// Fetches the signed-in user's profile plus their organization membership.
// MVP assumes one organization per user (first membership found). Redirects
// to /login or /onboarding when those preconditions aren't met — call this
// only from pages that should be gated that way.
//
// Wrapped in React's cache() because this is called from both the shared
// layout and individual pages/actions on every request. Without memoization
// each call independently hits supabase.auth.getUser(), and when the access
// token is near expiry those concurrent calls race to refresh the same
// rotating refresh token — one wins, the rest fail as "already used," and
// Supabase's reuse-detection can invalidate the whole session. cache() makes
// every call within a single request share one in-flight result.
export const requireCurrentUser = cache(async (): Promise<CurrentUserContext> => {
  const supabase = await createClient();

  // getUser() makes a network call to Supabase Auth to validate the session.
  // On serverless cold starts / transient network blips it can throw, which
  // would otherwise crash the entire page with a stark error. Retry a couple
  // times before giving up so a momentary hiccup doesn't take the page down.
  let user = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }

  if (lastError) {
    // All attempts failed to reach Supabase. Rethrow so the error boundary
    // shows a retry rather than spuriously logging the user out.
    throw lastError;
  }

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.organizations) {
    redirect("/onboarding");
  }

  return {
    userId: user.id,
    profile,
    organization: membership.organizations as unknown as Organization,
    role: membership.role as Role,
  };
});
