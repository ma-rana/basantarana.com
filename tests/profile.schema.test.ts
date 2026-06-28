// tests/profile.schema.test.ts
// Proves the JSONB Zod schema round-trips: valid data parses and comes back
// intact; invalid data throws. This is the "validate JSONB both directions"
// guarantee from CLAUDE.md, tested.

import { describe, it, expect } from "vitest";
import { BioVariantsSchema } from "../lib/schemas/profile";

describe("BioVariantsSchema", () => {
  it("parses valid bio variants and returns them intact (round-trip)", () => {
    const input = {
      short: "Short bio.",
      medium: "A medium-length bio with a bit more detail about the work.",
      long: "A long bio ".repeat(20).trim(),
    };
    const parsed = BioVariantsSchema.parse(input);
    expect(parsed).toEqual(input);
  });

  it("throws when a required variant is missing", () => {
    const bad = { short: "hi", medium: "there" }; // no `long`
    expect(() => BioVariantsSchema.parse(bad)).toThrow();
  });

  it("throws when `short` exceeds its 160-char max", () => {
    const bad = {
      short: "x".repeat(161),
      medium: "ok",
      long: "ok",
    };
    expect(() => BioVariantsSchema.parse(bad)).toThrow();
  });

  it("throws when a variant is the wrong type", () => {
    const bad = { short: 123, medium: "ok", long: "ok" };
    expect(() => BioVariantsSchema.parse(bad as unknown)).toThrow();
  });
});
