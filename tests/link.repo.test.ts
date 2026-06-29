// tests/link.repo.test.ts — LinkAsset repo + getActiveLinks placeholder resolution.
// DB-backed: needs Postgres + the generated client.

import { describe, it, expect, afterEach } from "vitest";
import { db } from "../lib/db";
import { LinkInputSchema } from "../lib/schemas/link";
import {
  createLink,
  deleteLink,
  activateLink,
  deactivateLink,
  addLinkToNextSlot,
  removeLinkFromSlot,
  listLinks,
  getActiveLinks,
} from "../lib/repos/link";

afterEach(async () => {
  await db.linkAsset.deleteMany();
});

describe("link schema", () => {
  it("prepends https:// when scheme is missing", () => {
    const p = LinkInputSchema.parse({ url: "github.com/me", label: "GitHub" });
    expect(p.url).toBe("https://github.com/me");
  });
  it("leaves an existing scheme untouched", () => {
    const p = LinkInputSchema.parse({ url: "http://x.com", label: "X" });
    expect(p.url).toBe("http://x.com");
  });
  it("requires a label", () => {
    expect(LinkInputSchema.safeParse({ url: "x.com", label: "" }).success).toBe(false);
  });
  it("slugifies a key", () => {
    const p = LinkInputSchema.parse({ url: "x.com", label: "X", key: "My GitHub" });
    expect(p.key).toBe("my-github");
  });
  it("blank key becomes undefined", () => {
    const p = LinkInputSchema.parse({ url: "x.com", label: "X", key: "   " });
    expect(p.key).toBeUndefined();
  });
});

describe("link repo — basics", () => {
  it("creates and lists a link", async () => {
    await createLink("https://github.com/me", "GitHub");
    const all = await listLinks();
    expect(all.length).toBe(1);
    expect(all[0].label).toBe("GitHub");
    expect(all[0].isActive).toBe(false);
  });

  it("activates and deactivates", async () => {
    const l = await createLink("https://x.com", "X");
    await activateLink(l.id);
    expect((await listLinks())[0].isActive).toBe(true);
    await deactivateLink(l.id);
    expect((await listLinks())[0].isActive).toBe(false);
  });

  it("deletes a link", async () => {
    const l = await createLink("https://x.com", "X");
    await deleteLink(l.id);
    expect((await listLinks()).length).toBe(0);
  });

  it("assigns sequential slots and can remove from slot", async () => {
    const a = await createLink("https://a.com", "A");
    const b = await createLink("https://b.com", "B");
    expect(await addLinkToNextSlot(a.id)).toBe(1);
    expect(await addLinkToNextSlot(b.id)).toBe(2);
    // re-adding an already-slotted link is a no-op returning its slot
    expect(await addLinkToNextSlot(a.id)).toBe(1);
    await removeLinkFromSlot(a.id);
    const a2 = (await listLinks()).find((l) => l.id === a.id);
    expect(a2?.slotOrder).toBeNull();
  });
});

describe("getActiveLinks — placeholders", () => {
  it("exposes the active link as canonical link/link_label", async () => {
    const l = await createLink("https://github.com/me", "GitHub");
    await activateLink(l.id);
    const out = await getActiveLinks();
    expect(out.link).toBe("https://github.com/me");
    expect(out.link_label).toBe("GitHub");
  });

  it("exposes numbered slots and the links list", async () => {
    const a = await createLink("https://a.com", "A");
    const b = await createLink("https://b.com", "B");
    await addLinkToNextSlot(a.id);
    await addLinkToNextSlot(b.id);
    const out = await getActiveLinks();
    expect(out.link1).toBe("https://a.com");
    expect(out.link1_label).toBe("A");
    expect(out.link2).toBe("https://b.com");
    expect(out.links).toEqual([
      { url: "https://a.com", label: "A" },
      { url: "https://b.com", label: "B" },
    ]);
  });

  it("exposes a named key as link_<key>", async () => {
    await createLink("https://github.com/me", "GitHub", "github");
    const out = await getActiveLinks();
    expect(out.link_github).toBe("https://github.com/me");
    expect(out.link_github_label).toBe("GitHub");
  });

  it("newest wins when two links share a key", async () => {
    // older first, then newer — both key "github"
    await createLink("https://github.com/old", "Old", "github");
    // ensure a distinct createdAt ordering
    await new Promise((r) => setTimeout(r, 5));
    await createLink("https://github.com/new", "New", "github");
    const out = await getActiveLinks();
    expect(out.link_github).toBe("https://github.com/new");
  });

  it("a link can be BOTH keyed and slotted (reachable two ways)", async () => {
    const l = await createLink("https://github.com/me", "GitHub", "github");
    await addLinkToNextSlot(l.id);
    const out = await getActiveLinks();
    expect(out.link_github).toBe("https://github.com/me"); // by name
    expect(out.link1).toBe("https://github.com/me"); // by slot
    expect(out.links).toContainEqual({ url: "https://github.com/me", label: "GitHub" });
  });

  it("returns nulls when nothing is active", async () => {
    const out = await getActiveLinks();
    expect(out.link).toBeNull();
    expect(out.link_label).toBeNull();
    expect(out.links).toEqual([]);
  });
});
