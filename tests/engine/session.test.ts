import { describe, it, expect } from "vitest";
import {
  normalizeSessionTarget,
  isTsumeFamilyId,
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
