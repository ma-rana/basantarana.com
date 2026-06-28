// lib/sanitize.ts — server-side HTML sanitization for user-authored content.
//
// Content blocks render PUBLICLY in a later phase, so any HTML the admin enters
// is a stored-XSS vector. We sanitize on WRITE (defense at the boundary) with a
// tight allowlist: basic inline formatting + links + lists only. No scripts, no
// event handlers, no javascript: URLs, no style/iframe/etc.

import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["b", "i", "em", "strong", "a", "code", "ul", "ol", "li", "br", "p"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Drop the entire element (and contents) for anything not allowed, rather
  // than leaking inner text of, say, a <script>.
  disallowedTagsMode: "discard",
};

export function sanitizeRichText(input: string): string {
  return sanitizeHtml(input, OPTIONS);
}
