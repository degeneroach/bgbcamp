// A small, tasteful corporate palette. Each task list gets a stable color
// derived from its name (via a simple hash), so lists stay visually
// distinct without looking like a rainbow of random hues on rename.
const LIST_ACCENT_COLORS = [
  "#2563EB", // blue
  "#16A34A", // green
  "#F59E0B", // amber
  "#7C3AED", // violet
  "#EC4899", // pink
  "#0F766E", // teal
];

export function getListAccentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % LIST_ACCENT_COLORS.length;
  return LIST_ACCENT_COLORS[index];
}
