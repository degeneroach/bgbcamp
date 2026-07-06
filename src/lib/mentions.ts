// Pulls mentioned user IDs out of rich-text HTML produced by the mention
// extension (each mention renders as <span data-mention-id="...">).
export function extractMentionIds(html: string): string[] {
  const matches = html.matchAll(/data-mention-id="([^"]+)"/g);
  const ids = new Set<string>();
  for (const match of matches) ids.add(match[1]);
  return Array.from(ids);
}

// Short plain-text preview of rich-text HTML, for notification excerpts.
export function htmlToExcerpt(html: string, maxLength = 140): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
