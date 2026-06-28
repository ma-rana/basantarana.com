// lib/schemas/project.ts — Zod schemas for Projects.
//
// content is JSONB: an array of typed blocks (discriminated union on `type`).
// Validated on write AND read. The `text` block's html is sanitized separately
// in the repo before storage (Zod checks shape; sanitize handles XSS).
//
// Relational fields (slug/status/featured/order/tags) are NOT here as JSONB —
// they're real columns/joins because we filter and sort by them.

import { z } from "zod";

// A URL field that tolerates a missing scheme: if the user types "basantarana.com"
// we normalize to "https://basantarana.com" before validating. An empty string
// stays empty (and then fails z.url(), surfacing a "required"-style error). Any
// value that already has a scheme (http:, https:, etc.) is left untouched.
const urlWithScheme = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  if (trimmed === "") return trimmed;
  // Already has a scheme like "https://", "http://", "mailto:" -> leave as-is.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}, z.url());

// ---- Content blocks ----
const HeadingBlock = z.object({
  type: z.literal("heading"),
  text: z.string().min(1).max(200),
  level: z.union([z.literal(2), z.literal(3)]).default(2),
});

const TextBlock = z.object({
  type: z.literal("text"),
  // May contain limited inline HTML; sanitized in the repo before save.
  html: z.string().max(20000),
});

const CodeBlock = z.object({
  type: z.literal("code"),
  code: z.string().max(20000),
  language: z.string().max(30).default(""),
});

const ImageBlock = z.object({
  type: z.literal("image"),
  url: urlWithScheme,
  alt: z.string().max(300).default(""),
});

const EmbedBlock = z.object({
  type: z.literal("embed"),
  url: urlWithScheme,
});

export const ContentBlockSchema = z.discriminatedUnion("type", [
  HeadingBlock,
  TextBlock,
  CodeBlock,
  ImageBlock,
  EmbedBlock,
]);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export const ProjectContentSchema = z.array(ContentBlockSchema).max(200);
export type ProjectContent = z.infer<typeof ProjectContentSchema>;

// ---- Project input (admin form) ----
export const ProjectStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ProjectInputSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required.")
    .max(120)
    .regex(SLUG_RE, "Use lowercase letters, numbers, and single hyphens."),
  title: z.string().min(1, "Title is required.").max(200),
  summary: z.string().min(1, "Summary is required.").max(400),
  status: ProjectStatusSchema.default("DRAFT"),
  featured: z.boolean().default(false),
  order: z.number().int().min(0).max(100000).default(0),
  tags: z.array(z.string().min(1).max(40)).max(30).default([]),
  content: ProjectContentSchema.default([]),
});
export type ProjectInput = z.infer<typeof ProjectInputSchema>;

// Turn a title into a candidate slug (client + server share the intent).
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
