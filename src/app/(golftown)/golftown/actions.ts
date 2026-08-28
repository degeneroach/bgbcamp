"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyPortalCredentials,
  setPortalCookie,
  clearPortalCookie,
  isPortalAuthed,
} from "@/lib/golftown-auth";
import { sendGolfTownOrderEmail } from "@/lib/order-email";
import type { OrderInput } from "@/app/(app)/tools/golf-town-queue/actions";
import type { GolfTownOrder } from "@/types/database";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const PAGE = "/golftown";

// Single-tenant lookup: the portal has no user session, so the org comes
// from the one organization row.
async function portalOrgId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("organizations").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function portalSignIn(username: string, password: string): Promise<ActionResult> {
  // Distinguish "env vars never reached this deployment" from a wrong
  // password — otherwise both look like a failed login.
  if (
    !process.env.GOLFTOWN_PORTAL_USER ||
    !process.env.GOLFTOWN_PORTAL_PASSWORD ||
    !process.env.GOLFTOWN_PORTAL_SECRET
  ) {
    console.error("golftown portal env missing", {
      user: Boolean(process.env.GOLFTOWN_PORTAL_USER),
      password: Boolean(process.env.GOLFTOWN_PORTAL_PASSWORD),
      secret: Boolean(process.env.GOLFTOWN_PORTAL_SECRET),
    });
    return { ok: false, error: "Portal is not configured yet — env vars missing." };
  }
  if (!verifyPortalCredentials(username, password)) {
    // Flat delay on failure; same generic message regardless of which
    // field was wrong.
    await new Promise((r) => setTimeout(r, 1000));
    return { ok: false, error: "Incorrect username or password" };
  }
  const set = await setPortalCookie();
  if (!set) return { ok: false, error: "Portal is not configured yet." };

  // Record the sign-in for the admin "last portal login" readout. Best
  // effort — a failure here must not block the login.
  try {
    const admin = createAdminClient();
    const organizationId = await portalOrgId();
    if (organizationId) {
      await admin
        .from("golftown_portal_status")
        .upsert(
          { organization_id: organizationId, last_login_at: new Date().toISOString() },
          { onConflict: "organization_id" }
        );
    }
  } catch (error) {
    console.error("failed to record portal login", error);
  }

  revalidatePath(PAGE);
  return { ok: true };
}

export async function portalSignOut(): Promise<void> {
  await clearPortalCookie();
  revalidatePath(PAGE);
}

export async function portalCreateOrder(input: OrderInput): Promise<ActionResult> {
  if (!(await isPortalAuthed())) return { ok: false, error: "Not signed in." };
  if (!input.endCustomer.trim()) return { ok: false, error: "Enter the customer name." };

  const admin = createAdminClient();
  const organizationId = await portalOrgId();
  if (!organizationId) return { ok: false, error: "Portal is not configured yet." };

  const { data: last } = await admin
    .from("golf_town_orders")
    .select("position")
    .eq("organization_id", organizationId)
    .is("completed_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await admin
    .from("golf_town_orders")
    .insert({
      organization_id: organizationId,
      position: (last?.position ?? -1) + 1,
      end_customer: input.endCustomer.trim(),
      ball_type: input.ballType.trim(),
      quantity_dozen: Math.max(1, Math.round(input.quantityDozen)),
      imprint_sides: input.imprintSides,
      date_needed: input.dateNeeded,
      drop_off_expected: input.dropOffExpected,
      artwork_path: input.artworkPath,
      artwork_filename: input.artworkFilename,
      notes: input.notes.trim() || null,
      contact: input.contact.trim() || null,
      submitted_by: "golftown",
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  await sendGolfTownOrderEmail(created as GolfTownOrder, "Matt (Golf Town)");

  revalidatePath(PAGE);
  revalidatePath("/tools/golf-town-queue");
  return { ok: true };
}

export async function portalUpdateOrder(
  orderId: string,
  input: OrderInput
): Promise<ActionResult> {
  if (!(await isPortalAuthed())) return { ok: false, error: "Not signed in." };
  if (!input.endCustomer.trim()) return { ok: false, error: "Enter the customer name." };

  const admin = createAdminClient();
  // The .eq("submitted_by", "golftown") is the server-side permission:
  // staff-created rows can never match this update.
  const { data: updated, error } = await admin
    .from("golf_town_orders")
    .update({
      end_customer: input.endCustomer.trim(),
      ball_type: input.ballType.trim(),
      quantity_dozen: Math.max(1, Math.round(input.quantityDozen)),
      imprint_sides: input.imprintSides,
      date_needed: input.dateNeeded,
      drop_off_expected: input.dropOffExpected,
      artwork_path: input.artworkPath,
      artwork_filename: input.artworkFilename,
      notes: input.notes.trim() || null,
      contact: input.contact.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("submitted_by", "golftown")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "This order can only be edited by BGBCamp staff." };
  }

  revalidatePath(PAGE);
  revalidatePath("/tools/golf-town-queue");
  return { ok: true };
}
