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
