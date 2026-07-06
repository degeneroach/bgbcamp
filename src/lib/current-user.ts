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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
