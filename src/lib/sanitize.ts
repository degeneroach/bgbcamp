import sanitizeHtmlLib from "sanitize-html";

// Sanitizes TipTap-authored HTML before it's persisted, so stored rich text
// can be rendered with dangerouslySetInnerHTML without an XSS risk.
//
// Uses sanitize-html (a pure string/parser-based sanitizer) rather than
// DOMPurify+jsdom: jsdom's dependency chain (html-encoding-sniffer ->
// @exodus/bytes) ships an ESM-only module that Node's require() can't load
// under Node 20, which crashed every server action that imported it.
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      "p", "br", "strong", "em", "s", "a", "ul", "ol", "li",
      "h2", "h3", "blockquote", "code", "pre", "img", "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "class"],
      span: ["data-type", "data-mention-id", "class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
