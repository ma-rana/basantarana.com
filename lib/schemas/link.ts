// lib/schemas/link.ts — validation for external links (LinkAsset).
//
// A link is a url + a human label. The url tolerates a missing scheme
// ("github.com/me" -> "https://github.com/me") like project block URLs, so the
// admin doesn't have to type the scheme every time.

import { z } from "zod";

// Mirror of project.ts's urlWithScheme: prepend https:// when no scheme is
// present, leave mailto:/http(s):// etc. untouched, then validate as a URL.
const urlWithScheme = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  if (trimmed === "") return trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed; // has scheme
  if (/^mailto:/i.test(trimmed)) return trimmed; // mailto has no //
  return `https://${trimmed}`;
}, z.url());

// Optional named key (e.g. "github"). Normalized to a safe slug so it can form a
// valid placeholder ({{ profile.link_github }}). Empty/whitespace -> undefined
// (the link is slot-only, no named placeholder). Anything left after slugifying
// must be 1–40 chars of [a-z0-9_-].
const optionalKey = z.preprocess(
  (val) => {
    if (typeof val !== "string") return undefined;
    const slug = val
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-") // spaces/punct -> hyphen
      .replace(/^[-_]+|[-_]+$/g, ""); // trim leading/trailing - or _
    return slug === "" ? undefined : slug;
  },
  z
    .string()
    .max(40, "Key is too long.")
    .regex(/^[a-z0-9_-]+$/, "Key may use lowercase letters, numbers, - and _.")
    .optional(),
);

export const LinkInputSchema = z.object({
  url: urlWithScheme,
  label: z.string().trim().min(1, "Label is required.").max(80),
  key: optionalKey,
});
export type LinkInput = z.infer<typeof LinkInputSchema>;
