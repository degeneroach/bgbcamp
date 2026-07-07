// Resolves a friendly display name for a person. Magic-link sign-ups don't
// provide a name, so the profile's full_name can be null or (from older
// signups) literally their email address. In those cases we derive a clean
// name from the email's local part — e.g. "justin@biodegradablegolfballs.com"
// becomes "Justin", "jane.doe@x.com" becomes "Jane Doe" — until the person
// sets a real name via their profile.
export function displayName(
  person: { full_name?: string | null; email?: string | null } | null | undefined
): string {
  if (!person) return "Someone";

  const email = person.email?.trim() ?? "";
  const name = person.full_name?.trim();

  if (name && name.toLowerCase() !== email.toLowerCase()) {
    return name;
  }

  if (!email) return name || "Someone";

  const local = email.split("@")[0] ?? email;
  const derived = local
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return derived || email;
}

export function displayInitials(
  person: { full_name?: string | null; email?: string | null } | null | undefined
): string {
  const name = displayName(person);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
