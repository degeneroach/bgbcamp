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
  // Each value is a light-dark() pair: muted corporate tone in light mode,
  // a brighter neon counterpart in dark. The browser resolves them via the
  // color-scheme declared on :root / .dark in globals.css.
  { text: "light-dark(#2563eb, #7dd3fc)", bar: "light-dark(#3b82f6, #38bdf8)", tint: "light-dark(#eff6ff, #10233a)" }, // blue
  { text: "light-dark(#0f766e, #5eead4)", bar: "light-dark(#14b8a6, #2dd4bf)", tint: "light-dark(#f0fdfa, #0b2b27)" }, // teal
  { text: "light-dark(#7c3aed, #c4b5fd)", bar: "light-dark(#8b5cf6, #a78bfa)", tint: "light-dark(#f5f3ff, #221a3d)" }, // violet
  { text: "light-dark(#b45309, #fcd34d)", bar: "light-dark(#d97706, #fbbf24)", tint: "light-dark(#fffbeb, #2e2208)" }, // amber
  { text: "light-dark(#be123c, #fda4af)", bar: "light-dark(#f43f5e, #fb7185)", tint: "light-dark(#fff1f2, #380f1a)" }, // rose
  { text: "light-dark(#475569, #cbd5e1)", bar: "light-dark(#64748b, #94a3b8)", tint: "light-dark(#f1f5f9, #1c2534)" }, // slate
  { text: "light-dark(#0369a1, #67e8f9)", bar: "light-dark(#0ea5e9, #22d3ee)", tint: "light-dark(#f0f9ff, #0a2733)" }, // sky
  { text: "light-dark(#4d7c0f, #bef264)", bar: "light-dark(#84cc16, #a3e635)", tint: "light-dark(#f7fee7, #1d2a0b)" }, // lime
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
