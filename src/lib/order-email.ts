import "server-only";
import { format, parseISO, startOfDay } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GolfTownOrder } from "@/types/database";

const FROM = () =>
  process.env.ORDER_FROM_EMAIL ?? "BGBCamp <orders@updates.customgolfballprinting.com>";

// Matt's address (or hello@ while testing). Shared by every email that
// goes TO Golf Town rather than to us.
function golftownRecipient(): string {
  return (
    process.env.GOLFTOWN_EMAIL ??
    process.env.GOLFTOWN_PICKUP_EMAIL ??
    "hello@customgolfballprinting.com"
  ).trim();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendViaResend(payload: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || payload.to.length === 0) {
    console.log("email skipped: RESEND_API_KEY or recipients not set");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM(), ...payload }),
  });
  if (!res.ok) {
    console.error("email send failed", payload.subject, res.status, await res.text());
  }
}

// The shared order sheet used by both the internal notification and Matt's
// confirmation: heading, label/value grid, artwork link, notes, one footer
// link. Layout stays dead simple for email clients.
async function buildOrderEmail(
  order: GolfTownOrder,
  submittedBy: string,
  footer: { href: string; label: string },
  options: { replyNote?: boolean } = {}
): Promise<{ html: string; text: string }> {
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
    <p style="margin:20px 0 0;font-size:14px;"><a href="${footer.href}" style="color:#0b6bcb;">${esc(footer.label)}</a></p>
    ${
      options.replyNote
        ? '<p style="margin:12px 0 0;font-size:13px;color:#666;">If any detail above looks wrong, reply to this email and we\'ll fix it before printing.</p>'
        : ""
    }
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
    `${footer.label}: ${footer.href}`,
    ...(options.replyNote
      ? ["If any detail looks wrong, reply to this email and we'll fix it before printing."]
      : []),
  ].join("\n");

  return { html, text };
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://bgbcamp.com").replace(/\/$/, "");
}

// Internal notification for every new order (portal or staff), to the
// ORDER_NOTIFY_EMAIL list. Called AFTER a successful insert; a failed send
// must never fail the order.
export async function sendGolfTownOrderEmail(
  order: GolfTownOrder,
  submittedBy?: string
): Promise<void> {
  try {
    const to = (process.env.ORDER_NOTIFY_EMAIL ?? "")
      .split(",")
      .map((address) => address.trim())
      .filter(Boolean);
    const label =
      submittedBy ?? (order.submitted_by === "golftown" ? "Matt (Golf Town)" : "BGBCamp staff");
    const body = await buildOrderEmail(order, label, {
      href: `${appUrl()}/tools/golf-town-queue/${order.id}/print`,
      label: "Open the work order sheet",
    });
    await sendViaResend({
      to,
      subject: `Golf Town Wholesale Order Placed - ${order.quantity_dozen} dozen`,
      ...body,
    });
  } catch (error) {
    console.error("golf town order email failed", error);
  }
}

// Matt's copy when STAFF add an order (he usually emailed it in): same
// sheet, portal link instead of the internal work order, plus the
// reply-if-wrong note.
export async function sendOrderConfirmationEmail(
  order: GolfTownOrder,
  submittedBy: string
): Promise<void> {
  try {
    const body = await buildOrderEmail(
      order,
      submittedBy,
      { href: `${appUrl()}/golftown`, label: "Track this order in the Golf Town portal" },
      { replyNote: true }
    );
    await sendViaResend({
      to: [golftownRecipient()],
      subject: `Order Received - ${order.end_customer} (${order.quantity_dozen} dozen)`,
      ...body,
    });
  } catch (error) {
    console.error("order confirmation email failed", error);
  }
}

// "Your order is ready for pick up" email to Golf Town, fired when staff
// hit the Printed / Ready for Pick Up button.
export async function sendReadyForPickupEmail(order: {
  id: string;
  end_customer: string;
  quantity_dozen: number;
  ball_type: string;
  imprint_sides: number;
}): Promise<void> {
  try {
    const balls = order.quantity_dozen * 12;
    const sided = order.imprint_sides === 2 ? "Double sided" : "Single sided";
    const html = `
<div style="background:#f6f7f9;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e5ea;border-radius:8px;padding:24px;">
    <h1 style="margin:0 0 4px;font-size:20px;color:#15803d;">Ready for pick up ✅</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#111;">The following order is printed and ready to be picked up:</p>
    <p style="margin:0;font-size:16px;font-weight:bold;color:#111;">${esc(order.end_customer)}</p>
    <p style="margin:4px 0 16px;font-size:14px;color:#111;">${order.quantity_dozen} dozen (${balls.toLocaleString()} balls) · ${esc(order.ball_type || "—")} · ${sided}</p>
    <p style="margin:0;font-size:14px;"><a href="${appUrl()}/golftown" style="color:#0b6bcb;">View the order in the Golf Town portal</a></p>
  </div>
</div>`;
    const text = [
      "Ready for pick up",
      "",
      order.end_customer,
      `${order.quantity_dozen} dozen (${balls} balls) · ${order.ball_type || "—"} · ${sided}`,
      "",
      `Portal: ${appUrl()}/golftown`,
    ].join("\n");
    await sendViaResend({
      to: [golftownRecipient()],
      subject: `Ready for Pick Up - ${order.end_customer} (${order.quantity_dozen} dozen)`,
      html,
      text,
    });
  } catch (error) {
    console.error("ready-for-pickup email failed", error);
  }
}
