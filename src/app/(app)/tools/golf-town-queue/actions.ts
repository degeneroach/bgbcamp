"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/current-user";
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
  artworkPath: string | null;
  artworkFilename: string | null;
  notes: string;
  contact: string;
}

export async function createGolfTownOrder(input: OrderInput): Promise<ActionResult> {
  if (!input.endCustomer.trim()) return { ok: false, error: "Enter the customer name." };
  const { organization } = await requireCurrentUser();
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

  const { error } = await supabase.from("golf_town_orders").insert({
    organization_id: organization.id,
    position: (last?.position ?? -1) + 1,
    end_customer: input.endCustomer.trim(),
    ball_type: input.ballType.trim(),
    quantity_dozen: Math.max(1, Math.round(input.quantityDozen)),
    imprint_sides: input.imprintSides,
    date_needed: input.dateNeeded,
    artwork_path: input.artworkPath,
    artwork_filename: input.artworkFilename,
    notes: input.notes.trim() || null,
    contact: input.contact.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(PAGE);
  return { ok: true };
}

export async function updateGolfTownOrder(
  orderId: string,
  input: OrderInput
): Promise<ActionResult> {
  if (!input.endCustomer.trim()) return { ok: false, error: "Enter the customer name." };
  await requireCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("golf_town_orders")
    .update({
      end_customer: input.endCustomer.trim(),
      ball_type: input.ballType.trim(),
      quantity_dozen: Math.max(1, Math.round(input.quantityDozen)),
      imprint_sides: input.imprintSides,
      date_needed: input.dateNeeded,
      artwork_path: input.artworkPath,
      artwork_filename: input.artworkFilename,
      notes: input.notes.trim() || null,
      contact: input.contact.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PAGE);
  return { ok: true };
}

export async function deleteGolfTownOrder(orderId: string): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("golf_town_orders").delete().eq("id", orderId);
  if (error) return { ok: false, error: error.message };
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
  flag: "balls_received" | "proof_approved" | "printed" | "shipped",
  value: boolean
): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("golf_town_orders")
    .update({ [flag]: value, updated_at: new Date().toISOString() } as Partial<GolfTownOrder>)
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PAGE);
  return { ok: true };
}

export async function completeGolfTownOrder(orderId: string): Promise<ActionResult> {
  await requireCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("golf_town_orders")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
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
    .update({ completed_at: null, position: (last?.position ?? -1) + 1 })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PAGE);
  return { ok: true };
}
