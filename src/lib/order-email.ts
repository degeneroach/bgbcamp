import "server-only";
import { format, parseISO, startOfDay } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GolfTownOrder } from "@/types/database";

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
