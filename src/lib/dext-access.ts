// Who can use the Dext Drop tool: admins, plus specific teammates granted
// access by email. Checked by the nav, the page, and the send action.
const DEXT_ALLOWED_EMAILS = new Set(["summer@biodegradablegolfballs.com"]);

export function canUseDext(role: string, email: string): boolean {
  return role === "owner" || role === "admin" || DEXT_ALLOWED_EMAILS.has(email.toLowerCase());
}
