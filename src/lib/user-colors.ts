// Muted, corporate per-user accent colors. A person is mapped to a stable
// accent by hashing a stable key (their email), so the same person always
// reads with the same subtle color across avatars, names, and activity.
export interface UserAccent {
  /** Readable name/text color. */
  text: string;
  /** Slightly stronger bar/border color. */
  bar: string;
  /** Very soft background tint for avatar fallbacks / accents. */
  tint: string;
}

const USER_ACCENTS: UserAccent[] = [
  { text: "#2563eb", bar: "#3b82f6", tint: "#eff6ff" }, // blue
  { text: "#0f766e", bar: "#14b8a6", tint: "#f0fdfa" }, // teal
  { text: "#7c3aed", bar: "#8b5cf6", tint: "#f5f3ff" }, // violet
  { text: "#b45309", bar: "#d97706", tint: "#fffbeb" }, // amber
  { text: "#be123c", bar: "#f43f5e", tint: "#fff1f2" }, // rose
  { text: "#475569", bar: "#64748b", tint: "#f1f5f9" }, // slate
  { text: "#0369a1", bar: "#0ea5e9", tint: "#f0f9ff" }, // sky
  { text: "#4d7c0f", bar: "#84cc16", tint: "#f7fee7" }, // lime
];

export function getUserAccent(key: string | null | undefined): UserAccent {
  const source = (key ?? "").trim().toLowerCase();
  if (!source) return USER_ACCENTS[USER_ACCENTS.length - 1]; // slate for unknown
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return USER_ACCENTS[Math.abs(hash) % USER_ACCENTS.length];
}

// A small, stable horizontal offset per user so consecutive items from
// different people visibly step in/out, making the timeline easier to scan
// by author without being chaotic.
export function getUserOffset(key: string | null | undefined): number {
  const source = (key ?? "").trim().toLowerCase();
  if (!source) return 0;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  // Two lanes: 0px or 20px indent.
  return Math.abs(hash) % 2 === 0 ? 0 : 20;
}
