import "server-only";
import { format, parseISO, startOfDay } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GolfTownOrder } from "@/types/database";

// Matt's address (or hello@ while testing). Shared by every email that
// goes TO Golf Town rather than to us.
function golftownRecipient(): string {
  return (
    process.env.GOLFTOWN_EMAIL ??
    process.env.GOLFTOWN_PICKUP_EMAIL ??
    "hello@customgolfballprinting.com"
  ).trim();
}

// Confirmation to Golf Town when STAFF add an order — Matt usually emailed
// it in, so this is his "we got it, it's in the queue" receipt, with a
// nudge toward the portal. Best effort; never fails the order.
export async function sendOrderConfirmationEmail(order: {
  end_customer: string;
  quantity_dozen: number;
  ball_type: string;
  imprint_sides: number;
  date_needed: string | null;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const to = golftownRecipient();
    if (!apiKey || !to) return;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://bgbcamp.com").replace(/\/$/, "");
    const balls = order.quantity_dozen * 12;
    const sided = order.imprint_sides === 2 ? "Double sided" : "Single sided";
    const needed = order.date_needed
      ? format(parseISO(order.date_needed), "EEEE, MMMM d, yyyy")
      : "Not specified";
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `
<div style="background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e5ea;border-radius:8px;padding:24px;">
    <h1 style="margin:0 0 4px;font-size:20px;color:#111;">Order received ✅</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#111;">Your order has been added to the print queue:</p>
    <p style="margin:0;font-size:16px;font-weight:bold;color:#111;">${esc(order.end_customer)}</p>
    <p style="margin:4px 0 4px;font-size:14px;color:#111;">${order.quantity_dozen} dozen (${balls.toLocaleString()} balls) · ${esc(order.ball_type || "—")} · ${sided}</p>
    <p style="margin:0 0 16px;font-size:14px;color:#111;">Date needed: ${esc(needed)}</p>
    <p style="margin:0;font-size:14px;">Track its status anytime — or submit your next order directly — in the <a href="${appUrl}/golftown" style="color:#0b6bcb;">Golf Town portal</a>.</p>
    <p style="margin:12px 0 0;font-size:13px;color:#666;">If any detail above looks wrong, reply to this email and we'll fix it before printing.</p>
  </div>
</div>`;
    const text = [
      "Order received",
      "",
      order.end_customer,
      `${order.quantity_dozen} dozen (${balls} balls) · ${order.ball_type || "—"} · ${sided}`,
      `Date needed: ${needed}`,
      "",
      `Track status or submit orders: ${appUrl}/golftown`,
      "If any detail looks wrong, reply to this email and we'll fix it before printing.",
    ].join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:
          process.env.ORDER_FROM_EMAIL ??
          "BGBCamp <orders@updates.customgolfballprinting.com>",
        to: [to],
        subject: `Order Received - ${order.end_customer} (${order.quantity_dozen} dozen)`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error("order confirmation email failed", res.status, await res.text());
    }
  } catch (error) {
    console.error("order confirmation email failed", error);
  }
}

// "Your order is ready for pick up" email to Golf Town, fired when staff
// hit the Printed / Ready for Pick Up button. Best effort: failures are
// logged and never fail the status change.
export async function sendReadyForPickupEmail(order: {
  id: string;
  end_customer: string;
  quantity_dozen: number;
  ball_type: string;
  imprint_sides: number;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const to = golftownRecipient();
    if (!apiKey || !to) {
      console.log("ready-for-pickup email skipped: RESEND_API_KEY not set");
      return;
    }
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://bgbcamp.com").replace(/\/$/, "");
    const balls = order.quantity_dozen * 12;
    const sided = order.imprint_sides === 2 ? "Double sided" : "Single sided";
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `
<div style="background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e5ea;border-radius:8px;padding:24px;">
    <h1 style="margin:0 0 4px;font-size:20px;color:#15803d;">Ready for pick up ✅</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#111;">The following order is printed and ready to be picked up:</p>
    <p style="margin:0;font-size:16px;font-weight:bold;color:#111;">${esc(order.end_customer)}</p>
    <p style="margin:4px 0 16px;font-size:14px;color:#111;">${order.quantity_dozen} dozen (${balls.toLocaleString()} balls) · ${esc(order.ball_type || "—")} · ${sided}</p>
    <p style="margin:0;font-size:14px;"><a href="${appUrl}/golftown" style="color:#0b6bcb;">View the order in the Golf Town portal</a></p>
  </div>
</div>`;
    const text = [
      "Ready for pick up",
      "",
      order.end_customer,
      `${order.quantity_dozen} dozen (${balls} balls) · ${order.ball_type || "—"} · ${sided}`,
      "",
      `Portal: ${appUrl}/golftown`,
    ].join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:
          process.env.ORDER_FROM_EMAIL ??
          "BGBCamp <orders@updates.customgolfballprinting.com>",
        to: [to],
        subject: `Ready for Pick Up - ${order.end_customer} (${order.quantity_dozen} dozen)`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error("ready-for-pickup email failed", res.status, await res.text());
    }
  } catch (error) {
    console.error("ready-for-pickup email failed", error);
  }
}

// Notification email for every new Golf Town order, from either the portal
// or the internal queue. Called AFTER a successful insert; a failed send
// must never fail the order — everything is caught and logged.
export async function sendGolfTownOrderEmail(order: GolfTownOrder): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    // Comma-separated list, e.g. "hello@x.com, rob@x.com".
    const to = (process.env.ORDER_NOTIFY_EMAIL ?? "")
      .split(",")
      .map((address) => address.trim())
      .filter(Boolean);
    if (!apiKey || to.length === 0) {
      console.log("golf town order email skipped: RESEND_API_KEY / ORDER_NOTIFY_EMAIL not set");
      return;
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://bgbcamp.com").replace(/\/$/, "");
    const balls = order.quantity_dozen * 12;
    const imprint =
      order.imprint_sides === 2
        ? "Double sided (2 pole locations — 2 hits per ball)"
        : "Single sided (1 location)";
    let dateNeeded = "Not specified";
    if (order.date_needed) {
      const due = parseISO(order.date_needed);
      dateNeeded = format(due, "EEEE, MMMM d, yyyy");
      if (due < startOfDay(new Date())) dateNeeded += " — PAST DUE";
    }
    const submittedBy = order.submitted_by === "golftown" ? "Golf Town portal" : "BGBCamp staff";
    const workOrderUrl = `${appUrl}/tools/golf-town-queue/${order.id}/print`;

    // 7-day signed URL so the artwork opens straight from the email.
    let artworkUrl: string | null = null;
    if (order.artwork_path) {
      const admin = createAdminClient();
      const { data } = await admin.storage
        .from("golf-town-artwork")
        .createSignedUrl(order.artwork_path, 7 * 24 * 60 * 60);
      artworkUrl = data?.signedUrl ?? null;
    }

    const rows: [string, string][] = [
      ["Quantity", `${order.quantity_dozen} dozen (${balls.toLocaleString()} balls)`],
      ["Ball type", order.ball_type || "—"],
      ["Imprint", imprint],
      ["Date needed", dateNeeded],
      ["Contact", order.contact || "—"],
      ["Submitted by", submittedBy],
    ];

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const artworkHtml = order.artwork_path
      ? `<p style="margin:16px 0 0;font-size:14px;color:#111;"><strong>Artwork:</strong> ${
          artworkUrl
            ? `<a href="${artworkUrl}" style="color:#0b6bcb;">${esc(order.artwork_filename ?? "View artwork")}</a>`
            : esc(order.artwork_filename ?? order.artwork_path)
        }</p>`
      : `<p style="margin:16px 0 0;font-size:14px;"><strong style="color:#dc2626;">No artwork attached</strong></p>`;

    const html = `
<div style="background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e5ea;border-radius:8px;padding:24px;">
    <h1 style="margin:0 0 4px;font-size:20px;color:#111;">${esc(order.end_customer)}</h1>
    <p style="margin:0 0 16px;font-size:13px;color:#666;">New Golf Town print order</p>
    <table style="border-collapse:collapse;width:100%;">
      ${rows
        .map(
          ([label, value]) => `<tr>
        <td style="padding:6px 12px 6px 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:6px 0;font-size:14px;color:#111;">${esc(value)}</td>
      </tr>`
        )
        .join("")}
    </table>
    ${artworkHtml}
    <p style="margin:16px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.05em;">Order notes</p>
    <p style="margin:4px 0 0;font-size:14px;color:#111;white-space:pre-wrap;">${
      order.notes ? esc(order.notes) : '<span style="color:#666;font-style:italic;">None</span>'
    }</p>
    <p style="margin:20px 0 0;font-size:14px;"><a href="${workOrderUrl}" style="color:#0b6bcb;">Open the work order sheet</a></p>
  </div>
</div>`;

    const text = [
      order.end_customer,
      "New Golf Town print order",
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      order.artwork_path
        ? `Artwork: ${order.artwork_filename ?? ""} ${artworkUrl ?? ""}`.trim()
        : "NO ARTWORK ATTACHED",
      "",
      `Order notes: ${order.notes ?? "None"}`,
      "",
      `Work order sheet: ${workOrderUrl}`,
    ].join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Must be an address at the Resend-verified domain
        // (updates.customgolfballprinting.com).
        from:
          process.env.ORDER_FROM_EMAIL ??
          "BGBCamp <orders@updates.customgolfballprinting.com>",
        to,
        subject: `Golf Town Wholesale Order Placed - ${order.quantity_dozen} dozen`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error("golf town order email failed", res.status, await res.text());
    }
  } catch (error) {
    console.error("golf town order email failed", error);
  }
}
