"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCurrentUser } from "@/lib/current-user";
import { logActivity } from "@/lib/activity";

export interface InviteResult {
  ok: boolean;
  error?: string;
}

export async function inviteMember(email: string): Promise<InviteResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const { userId: actorId, role, organization } = await requireCurrentUser();
  if (role !== "owner" && role !== "admin") {
    return { ok: false, error: "Only owners and admins can invite people." };
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", trimmed)
    .maybeSingle();

  let userId = existingProfile?.id;

  if (!userId) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(trimmed, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    });

    if (inviteError || !invited.user) {
      return { ok: false, error: inviteError?.message ?? "Could not send invite." };
    }
    userId = invited.user.id;
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .upsert({ organization_id: organization.id, user_id: userId, role: "member" }, { onConflict: "organization_id,user_id" });

  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  await logActivity(supabase, {
    organizationId: organization.id,
    actorId,
    entityType: "organization_member",
    entityId: userId,
    action: "person.added",
    metadata: { email: trimmed },
  });

  revalidatePath("/people");
  return { ok: true };
}

export interface TeamActionResult {
  ok: boolean;
  error?: string;
}

// Owners can manage anyone but themselves; admins can manage members only.
async function authorizeTeamChange(targetUserId: string) {
  const ctx = await requireCurrentUser();
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { error: "Only owners and admins can manage the team." as const, ctx };
  }
  if (targetUserId === ctx.userId) {
    return { error: "You can't change your own membership." as const, ctx };
  }
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("organization_members")
    .select("role, profiles(email)")
    .eq("organization_id", ctx.organization.id)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (!target) return { error: "Member not found." as const, ctx };
  if (target.role === "owner") {
    return { error: "The owner's membership can't be changed." as const, ctx };
  }
  if (ctx.role === "admin" && target.role === "admin") {
    return { error: "Only the owner can manage other admins." as const, ctx };
  }
  const email =
    (target as unknown as { profiles: { email: string } | null }).profiles?.email ?? "";
  return { error: null, ctx, targetEmail: email };
}

export async function updateMemberRole(
  targetUserId: string,
  role: "admin" | "member"
): Promise<TeamActionResult> {
  const auth = await authorizeTeamChange(targetUserId);
  if (auth.error) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("organization_id", auth.ctx.organization.id)
    .eq("user_id", targetUserId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/people");
  revalidatePath("/profile");
  return { ok: true };
}

export async function removeMember(targetUserId: string): Promise<TeamActionResult> {
  const auth = await authorizeTeamChange(targetUserId);
  if (auth.error) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", auth.ctx.organization.id)
    .eq("user_id", targetUserId);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    organizationId: auth.ctx.organization.id,
    actorId: auth.ctx.userId,
    entityType: "organization_member",
    entityId: targetUserId,
    action: "person.removed",
    metadata: { email: auth.targetEmail },
  });

  revalidatePath("/people");
  revalidatePath("/profile");
  return { ok: true };
}
