// lib/repos/project.ts — Project data layer.
//
// JSONB (content) validated both directions; text blocks sanitized on write.
// SECURITY: the PUBLIC read path (listPublishedProjects/getPublishedProjectBySlug)
// hard-filters status === PUBLISHED here in the repo, so no caller can forget
// and leak DRAFT/ARCHIVED. Admin reads (listProjects/getProjectById) see all.

import { db } from "../db";
import {
  ProjectContentSchema,
  type ProjectInput,
  type ProjectContent,
  type ContentBlock,
} from "../schemas/project";
import { sanitizeRichText } from "../sanitize";

export type ProjectStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type Project = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  featured: boolean;
  order: number;
  tags: string[];
  content: ProjectContent;
  createdAt: Date;
  updatedAt: Date;
};

type Row = {
  id: string; slug: string; title: string; summary: string;
  status: ProjectStatus; featured: boolean; order: number;
  content: unknown; createdAt: Date; updatedAt: Date;
  tags: { tag: { name: string } }[];
};

// Map a DB row to a typed Project, validating the JSONB on READ.
// Resilience: if a row's stored content doesn't match the current schema
// (e.g. legacy/hand-edited data), we DON'T crash the whole list — we log it and
// fall back to empty content so the rest of the project still renders. Writes
// stay strict (create/update validate input before saving), so this only ever
// rescues reads of pre-existing malformed data.
function toProject(row: Row): Project {
  const parsed = ProjectContentSchema.safeParse(row.content);
  if (!parsed.success) {
    console.warn(
      `[project repo] content for project ${row.id} (${row.slug}) failed schema ` +
        `validation; rendering with empty content. Issues:`,
      parsed.error.issues,
    );
  }
  return {
    id: row.id, slug: row.slug, title: row.title, summary: row.summary,
    status: row.status, featured: row.featured, order: row.order,
    tags: row.tags.map((t) => t.tag.name),
    content: parsed.success ? parsed.data : [],
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

const withTags = { tags: { include: { tag: true } } } as const;

// Sanitize text blocks just before persistence. Other block types are untouched
// (their fields are plain strings / validated URLs, not HTML).
function sanitizeContent(content: ProjectContent): ProjectContent {
  return content.map((block): ContentBlock => {
    if (block.type === "text") {
      return { ...block, html: sanitizeRichText(block.html) };
    }
    return block;
  });
}

// Resolve tag names to connectOrCreate clauses (tags are relational + reused).
function tagConnectOrCreate(tags: string[]) {
  const unique = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  return unique.map((name) => ({
    tag: {
      connectOrCreate: { where: { name }, create: { name } },
    },
  }));
}

// ---------- Admin reads (all statuses) ----------
export async function listProjects(): Promise<Project[]> {
  const rows = await db.project.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: withTags,
  });
  return rows.map(toProject);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const row = await db.project.findUnique({ where: { id }, include: withTags });
  return row ? toProject(row) : null;
}

// ---------- Public reads (PUBLISHED only — leak guard) ----------
export async function listPublishedProjects(): Promise<Project[]> {
  const rows = await db.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { order: "asc" }],
    include: withTags,
  });
  return rows.map(toProject);
}

export async function getPublishedProjectBySlug(slug: string): Promise<Project | null> {
  const row = await db.project.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: withTags,
  });
  return row ? toProject(row) : null;
}

// ---------- Mutations ----------
export type SlugTakenError = { kind: "slug_taken" };

export async function createProject(
  input: ProjectInput,
): Promise<Project | SlugTakenError> {
  const existing = await db.project.findUnique({ where: { slug: input.slug } });
  if (existing) return { kind: "slug_taken" };

  const content = sanitizeContent(ProjectContentSchema.parse(input.content)); // WRITE-side
  const row = await db.project.create({
    data: {
      slug: input.slug, title: input.title, summary: input.summary,
      status: input.status, featured: input.featured, order: input.order,
      content, tags: { create: tagConnectOrCreate(input.tags) },
    },
    include: withTags,
  });
  return toProject(row);
}

export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<Project | SlugTakenError | null> {
  const current = await db.project.findUnique({ where: { id } });
  if (!current) return null;

  // Slug uniqueness, excluding this same row.
  const clash = await db.project.findUnique({ where: { slug: input.slug } });
  if (clash && clash.id !== id) return { kind: "slug_taken" };

  const content = sanitizeContent(ProjectContentSchema.parse(input.content)); // WRITE-side

  // Replace tag set: clear existing joins, recreate from input.
  const row = await db.$transaction(async (tx) => {
    await tx.projectTag.deleteMany({ where: { projectId: id } });
    return tx.project.update({
      where: { id },
      data: {
        slug: input.slug, title: input.title, summary: input.summary,
        status: input.status, featured: input.featured, order: input.order,
        content, tags: { create: tagConnectOrCreate(input.tags) },
      },
      include: withTags,
    });
  });
  return toProject(row);
}

export async function deleteProject(id: string): Promise<void> {
  // ProjectTag rows cascade (onDelete: Cascade in the schema).
  await db.project.delete({ where: { id } }).catch(() => {});
}
