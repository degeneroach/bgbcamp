"use server";

import { requireCurrentUser } from "@/lib/current-user";

interface ActionResult {
  ok: boolean;
  error?: string;
  sent?: number;
}

export type DextCompany = "bgci" | "nonna";

const DEXT_ADDRESSES: Record<DextCompany, { label: string; email: string }> = {
  bgci: { label: "Biodegradable Golf Canada Inc.", email: "mitch.bgci@dext.cc" },
  nonna: { label: "1486882 B.C. Ltd.", email: "getnonna@dext.cc" },
};

const ACCEPTED = new Set(["pdf", "jpg", "jpeg", "png"]);
// Resend caps emails around 40MB including base64 overhead (~+33%), so keep
// each email's raw attachment total comfortably under that.
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_EMAIL_BYTES = 20 * 1024 * 1024;

export async function sendInvoicesToDext(
  company: DextCompany,
  formData: FormData
): Promise<ActionResult> {
  const { role } = await requireCurrentUser();
  if (role !== "owner" && role !== "admin") {
    return { ok: false, error: "Admins only." };
  }
  const target = DEXT_ADDRESSES[company];
  if (!target) return { ok: false, error: "Unknown company." };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Email isn't configured (RESEND_API_KEY)." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { ok: false, error: "No files received." };

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED.has(ext)) {
      return { ok: false, error: `"${file.name}" isn't a PDF, JPG, or PNG.` };
    }
    if (file.size > MAX_FILE_BYTES) {
      return {
        ok: false,
        error: `"${file.name}" is over 20MB — upload that one to Dext directly.`,
      };
    }
  }

  // Greedily pack files into as few emails as the size cap allows; Dext
  // splits multi-attachment emails into separate documents itself.
  const batches: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;
  for (const file of files) {
    if (current.length > 0 && currentBytes + file.size > MAX_EMAIL_BYTES) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) batches.push(current);

  const from =
    process.env.ORDER_FROM_EMAIL ?? "BGBCamp <orders@updates.customgolfballprinting.com>";

  for (const batch of batches) {
    const attachments = await Promise.all(
      batch.map(async (file) => ({
        filename: file.name,
        content: Buffer.from(await file.arrayBuffer()).toString("base64"),
      }))
    );
    const names = batch.map((f) => f.name).join("\n");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [target.email],
        subject: `Documents for ${target.label} (${batch.length} file${batch.length === 1 ? "" : "s"})`,
        text: `Submitted from BGBCamp Dext Drop:\n\n${names}`,
        attachments,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("dext email failed", res.status, detail);
      return {
        ok: false,
        error:
          res.status === 429
            ? "Hit the email rate limit — wait a moment and try again."
            : "Sending failed — the files were NOT delivered to Dext.",
      };
    }
  }

  return { ok: true, sent: files.length };
}
