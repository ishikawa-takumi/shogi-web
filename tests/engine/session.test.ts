import { describe, it, expect } from "vitest";
import {
  normalizeSessionTarget,
  isTsumeFamilyId,
  sanitizeFamilyIds,
  filterNonTsumeFamilyIds,
  matchesSidePreference,
} from "../../src/engine/session.ts";

describe("isTsumeFamilyId", () => {
  it("matches tsume family IDs", () => {
    expect(isTsumeFamilyId("tsume")).toBe(true);
    expect(isTsumeFamilyId("tsume-one-move")).toBe(true);
  });

  it("does not match non-tsume family IDs", () => {
    expect(isTsumeFamilyId("yagura")).toBe(false);
    expect(isTsumeFamilyId("aigakari")).toBe(false);
  });
});

describe("normalizeSessionTarget", () => {
  it("keeps 15 when tsume-only session", () => {
    expect(normalizeSessionTarget(15, ["tsume"])).toBe(15);
  });

  it("normalizes 15 for non-tsume session", () => {
    expect(normalizeSessionTarget(15, ["yagura"])).toBe(20);
  });

  it("passes through standard targets", () => {
    expect(normalizeSessionTarget(10, ["yagura"])).toBe(10);
    expect(normalizeSessionTarget(20, ["yagura"])).toBe(20);
    expect(normalizeSessionTarget(30, ["yagura"])).toBe(30);
  });
});

describe("sanitizeFamilyIds", () => {
  it("filters out IDs not in the allowed list", () => {
    expect(sanitizeFamilyIds(["a", "b", "c"], ["a", "c"])).toEqual(["a", "c"]);
  });

  it("removes duplicates", () => {
    expect(sanitizeFamilyIds(["a", "a", "b"], ["a", "b"])).toEqual(["a", "b"]);
  });

  it("preserves order", () => {
    expect(sanitizeFamilyIds(["c", "a", "b"], ["a", "b", "c"])).toEqual(["c", "a", "b"]);
  });

  it("returns empty when no overlap", () => {
    expect(sanitizeFamilyIds(["x", "y"], ["a", "b"])).toEqual([]);
  });

  it("returns empty when selected is empty", () => {
    expect(sanitizeFamilyIds([], ["a", "b"])).toEqual([]);
  });
});

describe("filterNonTsumeFamilyIds", () => {
  it("removes tsume family IDs", () => {
    expect(filterNonTsumeFamilyIds(["yagura", "tsume", "aigakari"])).toEqual(["yagura", "aigakari"]);
  });

  it("removes tsume- prefixed IDs", () => {
    expect(filterNonTsumeFamilyIds(["tsume-one-move", "yagura"])).toEqual(["yagura"]);
  });

  it("returns all when no tsume IDs present", () => {
    expect(filterNonTsumeFamilyIds(["yagura", "aigakari"])).toEqual(["yagura", "aigakari"]);
  });

  it("returns empty when all are tsume", () => {
    expect(filterNonTsumeFamilyIds(["tsume", "tsume-one-move"])).toEqual([]);
  });
});

describe("matchesSidePreference", () => {
  it("returns true for 'both' regardless of side", () => {
    expect(matchesSidePreference("both", "sente")).toBe(true);
    expect(matchesSidePreference("both", "gote")).toBe(true);
  });

  it("returns true when preference matches side", () => {
    expect(matchesSidePreference("sente", "sente")).toBe(true);
    expect(matchesSidePreference("gote", "gote")).toBe(true);
  });

  it("returns false when preference does not match side", () => {
    expect(matchesSidePreference("sente", "gote")).toBe(false);
    expect(matchesSidePreference("gote", "sente")).toBe(false);
  });
});
