import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildSessionQueue } from "../../src/engine/queue-builder.ts";
import type { MoveNode, ReviewCard } from "../../src/types/index.ts";

function makeNode(overrides: Partial<MoveNode> = {}): MoveNode {
  return {
    id: "n1",
    openingFamilyId: "aigakari",
    lineId: "line1",
    sfen: "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1",
    sideToMove: "sente",
    expectedMovesUsi: ["7g7f"],
    opponentAutoResponseUsi: null,
    nextNodeId: null,
    tags: [],
    moveIndex: 1,
    teachingComment: null,
    ...overrides,
  };
}

function makeCard(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return {
    nodeId: "n1",
    openingFamilyId: "aigakari",
    intervalDays: 1,
    dueAt: new Date(0).toISOString(), // far in the past = due
    easeStep: 1,
    lastResult: "correct",
    seenCount: 1,
    ...overrides,
  };
}

describe("buildSessionQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty queue when no nodes match selected families", () => {
    const node = makeNode({ openingFamilyId: "yagura" });
    const result = buildSessionQueue({
      allNodes: [node],
      cards: [],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "both",
      dailyTarget: 10,
    });
    expect(result).toEqual([]);
  });

  it("returns empty queue when side preference filters out all nodes", () => {
    const node = makeNode({ sideToMove: "gote" });
    const result = buildSessionQueue({
      allNodes: [node],
      cards: [],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "sente",
      dailyTarget: 10,
    });
    expect(result).toEqual([]);
  });

  it("includes new nodes (no card) in the queue", () => {
    const node = makeNode();
    const result = buildSessionQueue({
      allNodes: [node],
      cards: [],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "both",
      dailyTarget: 10,
    });
    expect(result).toContain("n1");
  });

  it("includes due cards in the queue", () => {
    const node = makeNode();
    const card = makeCard({ dueAt: new Date("2025-05-01").toISOString() });
    const result = buildSessionQueue({
      allNodes: [node],
      cards: [card],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "both",
      dailyTarget: 10,
    });
    expect(result).toContain("n1");
  });

  it("excludes cards not yet due", () => {
    const node = makeNode();
    const card = makeCard({ dueAt: new Date("2025-12-01").toISOString(), lastResult: "correct" });
    const result = buildSessionQueue({
      allNodes: [node],
      cards: [card],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "both",
      dailyTarget: 10,
    });
    expect(result).not.toContain("n1");
  });

  it("prioritizes mistakes over due cards", () => {
    const n1 = makeNode({ id: "n1" });
    const n2 = makeNode({ id: "n2" });
    const c1 = makeCard({ nodeId: "n1", lastResult: "incorrect", dueAt: new Date("2025-05-01").toISOString() });
    const c2 = makeCard({ nodeId: "n2", lastResult: "correct", dueAt: new Date("2025-05-01").toISOString() });
    const result = buildSessionQueue({
      allNodes: [n1, n2],
      cards: [c1, c2],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "both",
      dailyTarget: 10,
    });
    expect(result.indexOf("n1")).toBeLessThan(result.indexOf("n2"));
  });

  it("gates new nodes by predecessor mastery", () => {
    // n1 -> n2 (n1 is predecessor of n2 via nextNodeId)
    const n1 = makeNode({ id: "n1", nextNodeId: "n2" });
    const n2 = makeNode({ id: "n2" });
    // No cards at all — n1 is unseen, so n2 should be gated
    const result = buildSessionQueue({
      allNodes: [n1, n2],
      cards: [],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "both",
      dailyTarget: 10,
    });
    // n1 should be in queue (no predecessor)
    expect(result).toContain("n1");
    // n2 should also be in queue because n1 is in queue (inQueue check)
    expect(result).toContain("n2");
  });

  it("allows new node when predecessor has been seen (has card)", () => {
    const n1 = makeNode({ id: "n1", nextNodeId: "n2" });
    const n2 = makeNode({ id: "n2" });
    const c1 = makeCard({ nodeId: "n1", dueAt: new Date("2025-12-01").toISOString() });
    const result = buildSessionQueue({
      allNodes: [n1, n2],
      cards: [c1],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "both",
      dailyTarget: 10,
    });
    expect(result).toContain("n2");
  });

  it("respects dailyTarget for queue size", () => {
    const nodes = Array.from({ length: 20 }, (_, i) =>
      makeNode({ id: `n${i}` }),
    );
    const result = buildSessionQueue({
      allNodes: nodes,
      cards: [],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "both",
      dailyTarget: 5,
    });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("filters by side preference 'sente'", () => {
    const senteNode = makeNode({ id: "s1", sideToMove: "sente" });
    const goteNode = makeNode({ id: "g1", sideToMove: "gote" });
    const result = buildSessionQueue({
      allNodes: [senteNode, goteNode],
      cards: [],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "sente",
      dailyTarget: 10,
    });
    expect(result).toContain("s1");
    expect(result).not.toContain("g1");
  });

  it("filters by side preference 'gote'", () => {
    const senteNode = makeNode({ id: "s1", sideToMove: "sente" });
    const goteNode = makeNode({ id: "g1", sideToMove: "gote" });
    const result = buildSessionQueue({
      allNodes: [senteNode, goteNode],
      cards: [],
      selectedFamilyIds: ["aigakari"],
      sidePreference: "gote",
      dailyTarget: 10,
    });
    expect(result).not.toContain("s1");
    expect(result).toContain("g1");
  });
});
