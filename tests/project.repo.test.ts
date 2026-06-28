// tests/project.repo.test.ts — Project schema, sanitization, and repo.
// DB-backed parts need Postgres + generated client (run with npm test).

import { describe, it, expect, afterEach } from "vitest";
import { db } from "../lib/db";
import {
  ProjectInputSchema,
  ContentBlockSchema,
  slugify,
} from "../lib/schemas/project";
import { sanitizeRichText } from "../lib/sanitize";
import {
  createProject,
  updateProject,
  deleteProject,
  getProjectById,
  listPublishedProjects,
} from "../lib/repos/project";

const base = {
  slug: "test-project",
  title: "Test Project",
  summary: "A summary.",
  status: "PUBLISHED" as const,
  featured: false,
  order: 0,
  tags: ["Alpha", "Beta"],
  content: [{ type: "text" as const, html: "<p>Hello</p>" }],
};

afterEach(async () => {
  await db.projectTag.deleteMany();
  await db.project.deleteMany();
  await db.tag.deleteMany();
});

describe("project schema", () => {
  it("rejects an invalid slug", () => {
    expect(() => ProjectInputSchema.parse({ ...base, slug: "Not A Slug" })).toThrow();
  });
  it("rejects an unknown content block type", () => {
    const r = ContentBlockSchema.safeParse({ type: "video", url: "https://x.com" });
    expect(r.success).toBe(false);
  });
  it("accepts the five known block types", () => {
    for (const b of [
      { type: "heading", text: "H", level: 2 },
      { type: "text", html: "<p>x</p>" },
      { type: "code", code: "x", language: "ts" },
      { type: "image", url: "https://x.com/a.png", alt: "a" },
      { type: "embed", url: "https://x.com/v" },
    ]) {
      expect(ContentBlockSchema.safeParse(b).success).toBe(true);
    }
  });
  it("slugify derives a clean slug from a title", () => {
    expect(slugify("My Cool Project! (v2)")).toBe("my-cool-project-v2");
  });

  it("prepends https:// to a bare-domain image/embed url", () => {
    const img = ContentBlockSchema.parse({ type: "image", url: "basantarana.com", alt: "" });
    if (img.type === "image") expect(img.url).toBe("https://basantarana.com");
    const emb = ContentBlockSchema.parse({ type: "embed", url: "youtube.com/watch?v=x" });
    if (emb.type === "embed") expect(emb.url).toBe("https://youtube.com/watch?v=x");
  });

  it("leaves an existing scheme untouched and still rejects garbage", () => {
    const ok = ContentBlockSchema.parse({ type: "embed", url: "http://localhost:3000" });
    if (ok.type === "embed") expect(ok.url).toBe("http://localhost:3000");
    expect(ContentBlockSchema.safeParse({ type: "embed", url: "not a url" }).success).toBe(false);
  });
});

describe("sanitization", () => {
  it("strips <script> from a text block's html", () => {
    const out = sanitizeRichText('<p>ok</p><script>alert(1)</script>');
    expect(out).not.toContain("script");
    expect(out).toContain("ok");
  });
  it("drops javascript: links and event handlers", () => {
    const out = sanitizeRichText('<a href="javascript:evil()">x</a><img src=x onerror=alert(1)>');
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("onerror");
  });
});

describe("project repo", () => {
  it("creates a project and reads it back with tags + JSONB round-trip", async () => {
    const input = ProjectInputSchema.parse(base);
    const created = await createProject(input);
    expect("id" in created).toBe(true);
    if (!("id" in created)) return;
    const got = await getProjectById(created.id);
    expect(got?.title).toBe("Test Project");
    expect(got?.tags.sort()).toEqual(["Alpha", "Beta"]);
    expect(got?.content[0]).toMatchObject({ type: "text" });
  });

  it("sanitizes text-block html on write (stored XSS defense)", async () => {
    const input = ProjectInputSchema.parse({
      ...base,
      content: [{ type: "text", html: '<p>hi</p><script>alert(1)</script>' }],
    });
    const created = await createProject(input);
    if (!("id" in created)) throw new Error("create failed");
    const got = await getProjectById(created.id);
    const block = got?.content[0];
    expect(block?.type).toBe("text");
    if (block?.type === "text") expect(block.html).not.toContain("script");
  });

  it("rejects a duplicate slug", async () => {
    await createProject(ProjectInputSchema.parse(base));
    const dup = await createProject(ProjectInputSchema.parse(base));
    expect("kind" in dup && dup.kind).toBe("slug_taken");
  });

  it("listPublishedProjects excludes DRAFT and ARCHIVED (leak guard)", async () => {
    await createProject(ProjectInputSchema.parse({ ...base, slug: "pub", status: "PUBLISHED" }));
    await createProject(ProjectInputSchema.parse({ ...base, slug: "draft", status: "DRAFT" }));
    await createProject(ProjectInputSchema.parse({ ...base, slug: "arch", status: "ARCHIVED" }));
    const published = await listPublishedProjects();
    expect(published.map((p) => p.slug)).toEqual(["pub"]);
  });

  it("updates a project and replaces its tag set", async () => {
    const created = await createProject(ProjectInputSchema.parse(base));
    if (!("id" in created)) throw new Error("create failed");
    const updated = await updateProject(
      created.id,
      ProjectInputSchema.parse({ ...base, title: "Renamed", tags: ["Gamma"] }),
    );
    expect(updated && "title" in updated && updated.title).toBe("Renamed");
    const got = await getProjectById(created.id);
    expect(got?.tags).toEqual(["Gamma"]);
  });

  it("deletes a project", async () => {
    const created = await createProject(ProjectInputSchema.parse(base));
    if (!("id" in created)) throw new Error("create failed");
    await deleteProject(created.id);
    expect(await getProjectById(created.id)).toBeNull();
  });
});
