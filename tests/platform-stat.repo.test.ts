// tests/platform-stat.repo.test.ts — schema + repo, incl. the unique constraint.
// DB-backed parts need Postgres + generated client.

import { describe, it, expect, afterEach, vi } from "vitest";
import { db } from "../lib/db";
import { PlatformStatInputSchema } from "../lib/schemas/platform-stat";
import {
  createPlatformStat,
  updatePlatformStat,
  deletePlatformStat,
  getPlatformStatById,
  listPlatformStats,
  statDisplayValue,
  refreshStat,
  refreshAllStats,
  type PlatformStat,
} from "../lib/repos/platform-stat";

const base = { platform: "github", label: "Followers", value: 120, order: 1 };

afterEach(async () => {
  await db.platformStat.deleteMany();
  vi.restoreAllMocks();
});

// Build a fake fetch Response for mocking global fetch in live-stat tests.
function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("platform stat schema", () => {
  it("accepts valid input", () => {
    expect(PlatformStatInputSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an empty platform", () => {
    expect(PlatformStatInputSchema.safeParse({ ...base, platform: "" }).success).toBe(false);
  });
  it("rejects a negative value", () => {
    expect(PlatformStatInputSchema.safeParse({ ...base, value: -5 }).success).toBe(false);
  });
  it("rejects a non-integer value", () => {
    expect(PlatformStatInputSchema.safeParse({ ...base, value: 1.5 }).success).toBe(false);
  });
  it("treats blank apiUrl/apiPath as undefined (manual stat)", () => {
    const p = PlatformStatInputSchema.parse({ ...base, apiUrl: "", apiPath: "  " });
    expect(p.apiUrl).toBeUndefined();
    expect(p.apiPath).toBeUndefined();
  });
  it("accepts a valid apiUrl + dot path", () => {
    const r = PlatformStatInputSchema.safeParse({
      ...base,
      apiUrl: "https://api.github.com/users/x",
      apiPath: "items.0.statistics.subscriberCount",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a non-http apiUrl", () => {
    expect(
      PlatformStatInputSchema.safeParse({ ...base, apiUrl: "not a url", apiPath: "x" }).success,
    ).toBe(false);
  });
  it("rejects a malformed apiPath", () => {
    expect(
      PlatformStatInputSchema.safeParse({
        ...base,
        apiUrl: "https://api.github.com/users/x",
        apiPath: "a..b",
      }).success,
    ).toBe(false);
  });
});

describe("platform stat repo", () => {
  it("creates and reads back a stat", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(base));
    if ("kind" in created) throw new Error("create failed");
    const got = await getPlatformStatById(created.id);
    expect(got?.platform).toBe("github");
    expect(got?.value).toBe(120);
  });

  it("rejects a duplicate platform+label with the sentinel", async () => {
    await createPlatformStat(PlatformStatInputSchema.parse(base));
    const dup = await createPlatformStat(PlatformStatInputSchema.parse(base));
    expect("kind" in dup && dup.kind).toBe("duplicate");
  });

  it("allows the same platform with a different label", async () => {
    await createPlatformStat(PlatformStatInputSchema.parse(base));
    const other = await createPlatformStat(
      PlatformStatInputSchema.parse({ ...base, label: "Stars" }),
    );
    expect("kind" in other).toBe(false); // not a duplicate
  });

  it("updates a stat's value", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(base));
    if ("kind" in created) throw new Error("create failed");
    const updated = await updatePlatformStat(
      created.id,
      PlatformStatInputSchema.parse({ ...base, value: 200 }),
    );
    expect(updated && "value" in updated && updated.value).toBe(200);
  });

  it("update returns null for a missing stat", async () => {
    const r = await updatePlatformStat("nope", PlatformStatInputSchema.parse(base));
    expect(r).toBeNull();
  });

  it("deletes a stat", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(base));
    if ("kind" in created) throw new Error("create failed");
    await deletePlatformStat(created.id);
    expect(await getPlatformStatById(created.id)).toBeNull();
  });
});

describe("live stats — display value", () => {
  const make = (over: Partial<PlatformStat>): PlatformStat => ({
    id: "x", platform: "github", label: "Followers", value: 100, order: 0,
    apiUrl: null, apiPath: null, cachedValue: null, fetchedAt: null, ...over,
  });

  it("uses manual value when no apiUrl", () => {
    expect(statDisplayValue(make({ value: 100 }))).toBe(100);
  });
  it("uses cachedValue when apiUrl is set and cache exists", () => {
    expect(statDisplayValue(make({ value: 100, apiUrl: "https://x", cachedValue: 555 }))).toBe(555);
  });
  it("falls back to manual value when apiUrl is set but no cache yet", () => {
    expect(statDisplayValue(make({ value: 100, apiUrl: "https://x", cachedValue: null }))).toBe(100);
  });
});

describe("live stats — refresh", () => {
  const apiBase = {
    ...base,
    apiUrl: "https://api.github.com/users/x",
    apiPath: "followers",
  };

  it("fetches, parses the path, and caches the number", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(apiBase));
    if ("kind" in created) throw new Error("create failed");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ followers: 4242 })));

    const r = await refreshStat(created.id);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(4242);

    const got = await getPlatformStatById(created.id);
    expect(got?.cachedValue).toBe(4242);
    expect(got?.fetchedAt).not.toBeNull();
    // display value now reflects the live number
    expect(got && statDisplayValue(got)).toBe(4242);
  });

  it("coerces string counts (YouTube style, nested array) to int", async () => {
    const created = await createPlatformStat(
      PlatformStatInputSchema.parse({
        ...base,
        label: "Subscribers",
        apiUrl: "https://www.googleapis.com/youtube/v3/channels?key=x",
        apiPath: "items.0.statistics.subscriberCount",
      }),
    );
    if ("kind" in created) throw new Error("create failed");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ items: [{ statistics: { subscriberCount: "98765" } }] })),
    );

    const r = await refreshStat(created.id);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(98765);
  });

  it("leaves the old cache intact when the fetch fails (HTTP error)", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(apiBase));
    if ("kind" in created) throw new Error("create failed");
    // seed a known-good cache
    await db.platformStat.update({ where: { id: created.id }, data: { cachedValue: 999, fetchedAt: new Date() } });
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, false, 503)));

    const r = await refreshStat(created.id);
    expect(r.ok).toBe(false);
    const got = await getPlatformStatById(created.id);
    expect(got?.cachedValue).toBe(999); // unchanged — a transient error didn't wipe it
  });

  it("fails cleanly when the path doesn't resolve to a number", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(apiBase));
    if ("kind" in created) throw new Error("create failed");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ followers: "not-a-number" })));

    const r = await refreshStat(created.id);
    expect(r.ok).toBe(false);
    expect(await getPlatformStatById(created.id).then((s) => s?.cachedValue)).toBeNull();
  });

  it("refreshAllStats only touches API-backed stats", async () => {
    await createPlatformStat(PlatformStatInputSchema.parse(base)); // manual, no apiUrl
    await createPlatformStat(PlatformStatInputSchema.parse({ ...apiBase, label: "Stars" }));
    const fetchMock = vi.fn(async () => jsonResponse({ followers: 7 }));
    vi.stubGlobal("fetch", fetchMock);

    const results = await refreshAllStats();
    expect(results.length).toBe(1); // only the API-backed one
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clearing apiUrl on update reverts to manual and drops the cache", async () => {
    const created = await createPlatformStat(PlatformStatInputSchema.parse(apiBase));
    if ("kind" in created) throw new Error("create failed");
    await db.platformStat.update({ where: { id: created.id }, data: { cachedValue: 500, fetchedAt: new Date() } });

    // update with blank api fields -> manual
    const updated = await updatePlatformStat(
      created.id,
      PlatformStatInputSchema.parse({ ...base, apiUrl: "", apiPath: "" }),
    );
    if (!updated || "kind" in updated) throw new Error("update failed");
    expect(updated.apiUrl).toBeNull();
    expect(updated.cachedValue).toBeNull();
    expect(updated.fetchedAt).toBeNull();
    expect(statDisplayValue(updated)).toBe(base.value);
  });
});
