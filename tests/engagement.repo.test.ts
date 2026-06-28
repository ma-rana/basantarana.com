// tests/engagement.repo.test.ts — engagement events (DB-backed; runs on your machine).
// Requires the add_engagement_session migration applied to the test DB.

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "../lib/db";
import {
  recordView,
  recordLike,
  getProjectLikeCount,
  getEngagementStats,
} from "../lib/repos/engagement";

beforeEach(async () => {
  await db.engagementEvent.deleteMany();
});
afterAll(async () => {
  await db.engagementEvent.deleteMany();
});

describe("engagement — views", () => {
  it("records a profile view as exactly one event", async () => {
    await recordView("profile");
    const count = await db.engagementEvent.count({ where: { type: "view", targetType: "profile" } });
    expect(count).toBe(1);
  });

  it("records a project view with its slug", async () => {
    await recordView("project", "stemm-lab");
    const count = await db.engagementEvent.count({
      where: { type: "view", targetType: "project", targetId: "stemm-lab" },
    });
    expect(count).toBe(1);
  });

  it("allows many identical views (null session never collides)", async () => {
    await recordView("project", "stemm-lab");
    await recordView("project", "stemm-lab");
    await recordView("project", "stemm-lab");
    const count = await db.engagementEvent.count({
      where: { type: "view", targetType: "project", targetId: "stemm-lab" },
    });
    expect(count).toBe(3);
  });
});

describe("engagement — likes", () => {
  it("records a like as exactly one event and returns true", async () => {
    const created = await recordLike("stemm-lab", "sess-aaaaaaaa");
    expect(created).toBe(true);
    expect(await getProjectLikeCount("stemm-lab")).toBe(1);
  });

  it("is idempotent: same session liking twice writes only one row", async () => {
    const first = await recordLike("stemm-lab", "sess-aaaaaaaa");
    const second = await recordLike("stemm-lab", "sess-aaaaaaaa");
    expect(first).toBe(true);
    expect(second).toBe(false); // duplicate -> no-op
    expect(await getProjectLikeCount("stemm-lab")).toBe(1);
  });

  it("counts distinct sessions separately", async () => {
    await recordLike("stemm-lab", "sess-aaaaaaaa");
    await recordLike("stemm-lab", "sess-bbbbbbbb");
    expect(await getProjectLikeCount("stemm-lab")).toBe(2);
  });
});

describe("engagement — stats aggregation", () => {
  it("aggregates profile views, project views, and likes correctly", async () => {
    await recordView("profile");
    await recordView("profile");
    await recordView("project", "stemm-lab");
    await recordView("project", "stemm-lab");
    await recordView("project", "portfolio-cms");
    await recordLike("stemm-lab", "sess-aaaaaaaa");
    await recordLike("stemm-lab", "sess-bbbbbbbb");
    await recordLike("portfolio-cms", "sess-aaaaaaaa");

    const stats = await getEngagementStats();
    expect(stats.profileViews).toBe(2);
    expect(stats.totalProjectViews).toBe(3);
    expect(stats.totalLikes).toBe(3);

    const stemm = stats.perProject.find((p) => p.targetId === "stemm-lab")!;
    expect(stemm.views).toBe(2);
    expect(stemm.likes).toBe(2);

    const cms = stats.perProject.find((p) => p.targetId === "portfolio-cms")!;
    expect(cms.views).toBe(1);
    expect(cms.likes).toBe(1);
  });
});
