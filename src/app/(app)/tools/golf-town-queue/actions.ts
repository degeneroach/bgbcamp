"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
import { sendGolfTownOrderEmail } from "@/lib/order-email";
import { logActivity } from "@/lib/activity";
import type { GolfTownOrder } from "@/types/database";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const PAGE = "/tools/golf-town-queue";

export interface OrderInput {
  endCustomer: string;
  ballType: string;
  quantityDozen: number;
  imprintSides: 1 | 2;
  dateNeeded: string | null;
  dropOffExpected: string | null;
  artworkPath: string | null;
  artworkFilename: string | null;
  notes: string;
  contact: string;
  /** Staff-only; the portal never writes it. */
  invoiceUrl?: string | null;
}

export async function createGolfTownOrder(input: OrderInput): Promise<ActionResult> {
  if (!input.endCustomer.trim()) return { ok: false, error: "Enter the customer name." };
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  // Append to the bottom of the active queue.
  const { data: last } = await supabase
    .from("golf_town_orders")
    .select("position")
    .eq("organization_id", organization.id)
    .is("completed_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("golf_town_orders")
    .insert({
      organization_id: organization.id,
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
      invoice_url: input.invoiceUrl?.trim() || null,
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  // Notify after the insert succeeded; a failed email never fails the order.
  await sendGolfTownOrderEmail(created as GolfTownOrder);

  await logActivity(supabase, {
    organizationId: organization.id,
    actorId: userId,
    entityType: "golf_town_order",
    entityId: created.id,
    action: "golftown.created",
    metadata: { customer: created.end_customer, quantity: String(created.quantity_dozen) },
  });

  revalidatePath(PAGE);
  return { ok: true };
}

export async function updateGolfTownOrder(
  orderId: string,
  input: OrderInput
): Promise<ActionResult> {
  if (!input.endCustomer.trim()) return { ok: false, error: "Enter the customer name." };
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
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
      invoice_url: input.invoiceUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    organizationId: organization.id,
    actorId: userId,
    entityType: "golf_town_order",
    entityId: orderId,
    action: "golftown.updated",
    metadata: { customer: input.endCustomer.trim() },
  });

  revalidatePath(PAGE);
  return { ok: true };
}

export async function deleteGolfTownOrder(orderId: string): Promise<ActionResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("golf_town_orders")
    .select("end_customer")
    .eq("id", orderId)
    .maybeSingle();
  const { error } = await supabase.from("golf_town_orders").delete().eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    organizationId: organization.id,
    actorId: userId,
    entityType: "golf_town_order",
    entityId: orderId,
    action: "golftown.deleted",
    metadata: { customer: existing?.end_customer ?? "order" },
  });

  revalidatePath(PAGE);
  return { ok: true };
}

export async function reorderGolfTownOrders(orderedIds: string[]): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createClient();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("golf_town_orders").update({ position: index }).eq("id", id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath(PAGE);
  return { ok: true };
}

export async function setGolfTownOrderFlag(
  orderId: string,
  flag: "balls_received" | "proof_approved" | "printed" | "shipped" | "invoiced" | "paid",
  value: boolean
): Promise<ActionResult> {
  const { userId, organization } = await requireCurrentUser();
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("golf_town_orders")
    .update({ [flag]: value, updated_at: new Date().toISOString() } as Partial<GolfTownOrder>)
    .eq("id", orderId)
    .select("end_customer, shipped, paid, completed_at")
    .single();
  if (error) return { ok: false, error: error.message };

  // An order is finished once it's both picked up AND paid — picked up but
  // unpaid (or paid but not picked up) stays in the active queue.
  if (row.shipped && row.paid && !row.completed_at) {
    await supabase
      .from("golf_town_orders")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", orderId);
  }

  // Progress lands on the activity feed/calendar; unchecking (a correction)
  // stays quiet.
  if (value) {
    const STATUS_LABELS: Record<string, string> = {
      balls_received: "balls received",
      proof_approved: "proof approved",
      printed: "printed / ready for pick up",
      shipped: "picked up",
      invoiced: "invoiced",
      paid: "paid",
    };
    await logActivity(supabase, {
      organizationId: organization.id,
      actorId: userId,
      entityType: "golf_town_order",
      entityId: orderId,
      action: "golftown.status",
      metadata: { customer: row.end_customer, status: STATUS_LABELS[flag] ?? flag },
    });
  }

  revalidatePath(PAGE);
  return { ok: true };
}

export async function restoreGolfTownOrder(orderId: string): Promise<ActionResult> {
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();

  // Back to the bottom of the active queue.
  const { data: last } = await supabase
    .from("golf_town_orders")
    .select("position")
    .eq("organization_id", organization.id)
    .is("completed_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("golf_town_orders")
    // Flags are left as-is: restore means "this isn't finished", and Rob
    // unchecks whichever flag was wrong (picked up or paid).
    .update({ completed_at: null, position: (last?.position ?? -1) + 1 })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PAGE);
  return { ok: true };
}
