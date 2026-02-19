import { describe, it, expect } from "vitest";
import { loadCatalog, validateCatalogReport, buildPromptNode } from "../../src/engine/catalog.ts";
import catalogJson from "../../content/opening_catalog_v1.json";

describe("loadCatalog", () => {
  it("loads and validates the bundled catalog without errors", () => {
    const cache = loadCatalog(JSON.stringify(catalogJson));
    expect(cache.catalog.schemaVersion).toBe(1);
    expect(cache.catalog.families.length).toBeGreaterThan(0);
    expect(cache.nodeById.size).toBeGreaterThan(0);
  });

  it("throws on invalid JSON", () => {
    expect(() => loadCatalog("not json")).toThrow();
  });
});

describe("validateCatalogReport", () => {
  it("bundled catalog passes validation", () => {
    const report = validateCatalogReport(catalogJson as any);
    expect(report.isValid).toBe(true);
    expect(report.issueCount).toBe(0);
  });

  it("detects broken nextNodeId links", () => {
    const broken = {
      schemaVersion: 1,
      families: [{ id: "f1", nameJa: "Test", difficulty: "beginner", lineIds: ["l1"] }],
      lines: [{ id: "l1", familyId: "f1", nameJa: "Line", rootNodeId: "n1", nodeIds: ["n1"] }],
      nodes: [{
        id: "n1",
        openingFamilyId: "f1",
        lineId: "l1",
        sfen: "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1",
        sideToMove: "sente",
        expectedMovesUsi: ["7g7f"],
        opponentAutoResponseUsi: null,
        nextNodeId: "missing",
        tags: [],
        moveIndex: 1,
      }],
    };
    const report = validateCatalogReport(broken as any);
    expect(report.isValid).toBe(false);
    expect(report.issues.some((i) => i.message.includes("nextNodeId"))).toBe(true);
  });

  it("detects empty families", () => {
    const empty = { schemaVersion: 1, families: [], lines: [], nodes: [] };
    const report = validateCatalogReport(empty as any);
    expect(report.isValid).toBe(false);
  });

  it("detects duplicate family ids", () => {
    const dup = {
      schemaVersion: 1,
      families: [
        { id: "f1", nameJa: "A", difficulty: "beginner", lineIds: ["l1"] },
        { id: "f1", nameJa: "B", difficulty: "beginner", lineIds: ["l1"] },
      ],
      lines: [{ id: "l1", familyId: "f1", nameJa: "L", rootNodeId: "n1", nodeIds: ["n1"] }],
      nodes: [{
        id: "n1", openingFamilyId: "f1", lineId: "l1",
        sfen: "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1",
        sideToMove: "sente", expectedMovesUsi: ["7g7f"],
        opponentAutoResponseUsi: null, nextNodeId: null, tags: [], moveIndex: 1,
      }],
    };
    const report = validateCatalogReport(dup as any);
    expect(report.issues.some((i) => i.message.includes("重複した family"))).toBe(true);
  });
});

describe("buildPromptNode", () => {
  it("builds a prompt node from the catalog cache", () => {
    const cache = loadCatalog(JSON.stringify(catalogJson));
    const firstNodeId = cache.catalog.nodes[0].id;
    const prompt = buildPromptNode(cache, firstNodeId);

    expect(prompt).not.toBeNull();
    expect(prompt!.nodeId).toBe(firstNodeId);
    expect(prompt!.openingNameJa).toBeTruthy();
    expect(prompt!.expectedMovesUsi.length).toBeGreaterThan(0);
  });

  it("returns null for unknown node id", () => {
    const cache = loadCatalog(JSON.stringify(catalogJson));
    expect(buildPromptNode(cache, "nonexistent")).toBeNull();
  });
});
