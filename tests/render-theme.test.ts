// tests/render-theme.test.ts — Phase 3 engine behavior.
// DB-backed (needs Postgres + generated client + the theme folders on disk).
// Run with `npm test`. Sets up a minimal published + draft project and a
// profile, then asserts the engine's guarantees.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../lib/db";
import { renderPage, getActiveThemeKey } from "../app/lib/render-theme";
import { getActiveMedia } from "../app/lib/media";

beforeAll(async () => {
  // Clean slate for the tables the engine reads.
  await db.engagementEvent.deleteMany();
  await db.projectTag.deleteMany();
  await db.project.deleteMany();
  await db.tag.deleteMany();
  await db.mediaAsset.deleteMany();
  await db.profile.deleteMany();
  await db.theme.deleteMany();

  await db.theme.create({ data: { key: "minimal", name: "Minimal", isActive: true } });
  await db.theme.create({ data: { key: "showcase", name: "Showcase", isActive: false } });

  await db.profile.create({
    data: {
      name: "Render Test",
      headline: "Testing the engine",
      bioVariants: { short: "Short bio.", medium: "Medium.", long: "Long bio here." },
    },
  });

  await db.project.create({
    data: {
      slug: "published-one", title: "Published One", summary: "Visible.",
      status: "PUBLISHED", featured: true, order: 1, content: [],
    },
  });
  await db.project.create({
    data: {
      slug: "secret-draft", title: "Secret Draft", summary: "Hidden.",
      status: "DRAFT", featured: false, order: 2, content: [],
    },
  });
});

afterAll(async () => {
  // renderPage() fires view records fire-and-forget (not awaited). Give any
  // in-flight writes a moment to land, THEN clear EngagementEvent so this
  // suite's stray views don't leak into the engagement suite's counts.
  await new Promise((r) => setTimeout(r, 50));
  await db.engagementEvent.deleteMany();
  await db.projectTag.deleteMany();
  await db.project.deleteMany();
  await db.tag.deleteMany();
  await db.mediaAsset.deleteMany();
  await db.profile.deleteMany();
  await db.theme.deleteMany();
});

describe("render engine — URL mapping", () => {
  it("renders the home page at /", async () => {
    const { html, status } = await renderPage("/");
    expect(status).toBe(200);
    expect(html).toContain("Render Test"); // profile name in layout/home
  });

  it("renders /about", async () => {
    const { status, html } = await renderPage("/about");
    expect(status).toBe(200);
    expect(html).toContain("Long bio here."); // about uses bio.long
  });

  it("renders /contact", async () => {
    const { status, html } = await renderPage("/contact");
    expect(status).toBe(200);
    expect(html.toLowerCase()).toContain("contact");
  });

  it("renders a published project page", async () => {
    const { status, html } = await renderPage("/projects/published-one");
    expect(status).toBe(200);
    expect(html).toContain("Published One");
  });

  it("404s an unknown slug", async () => {
    const { status } = await renderPage("/projects/does-not-exist");
    expect(status).toBe(404);
  });

  it("404s an unmatched path", async () => {
    const { status } = await renderPage("/nope/nope");
    expect(status).toBe(404);
  });
});

describe("render engine — security & data guarantees", () => {
  it("never shows a DRAFT project on the home page", async () => {
    const { html } = await renderPage("/");
    expect(html).toContain("Published One");
    expect(html).not.toContain("Secret Draft"); // DRAFT excluded
  });

  it("404s a DRAFT project's direct URL (not published)", async () => {
    const { status } = await renderPage("/projects/secret-draft");
    expect(status).toBe(404); // resolvePage only finds it among PUBLISHED
  });

  it("resolves unset media to null (not empty string)", async () => {
    const media = await getActiveMedia();
    expect(media.avatar).toBeNull();
    expect(media.background).toBeNull();
    expect(media.cover).toBeNull();
    expect(media.cv).toBeNull();
  });
});

describe("render engine — theme switch", () => {
  it("reads the active theme key", async () => {
    expect(await getActiveThemeKey()).toBe("minimal");
  });

  it("changes the active key when a different theme is activated", async () => {
    await db.$transaction([
      db.theme.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      db.theme.update({ where: { key: "showcase" }, data: { isActive: true } }),
    ]);
    expect(await getActiveThemeKey()).toBe("showcase");

    // The rendered home page should now link the showcase stylesheet.
    const { html } = await renderPage("/");
    expect(html).toContain("/themes/showcase/style.css");

    // restore
    await db.$transaction([
      db.theme.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      db.theme.update({ where: { key: "minimal" }, data: { isActive: true } }),
    ]);
  });
});
