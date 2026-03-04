import { describe, it, expect } from "vitest";
import {
  buildHintLadder,
  resolveHintText,
  hintButtonLabel,
} from "../../src/engine/hints.ts";
import type { PromptNode, HintLadder, HintLevel } from "../../src/types/index.ts";

function makePrompt(overrides: Partial<PromptNode> = {}): PromptNode {
  return {
    nodeId: "n1",
    openingFamilyId: "aigakari",
    openingNameJa: "相掛かり",
    sfen: "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1",
    sideToMove: "sente",
    expectedMovesUsi: ["7g7f"],
    tags: [],
    moveIndex: 1,
    teachingComment: null,
    ...overrides,
  };
}

describe("buildHintLadder", () => {
  it("returns null for null prompt", () => {
    expect(buildHintLadder(null)).toBeNull();
  });

  it("returns null when expectedMovesUsi is empty", () => {
    const prompt = makePrompt({ expectedMovesUsi: [] });
    expect(buildHintLadder(prompt)).toBeNull();
  });

  it("returns a 3-level ladder for a normal move", () => {
    const prompt = makePrompt({ expectedMovesUsi: ["7g7f"] });
    const ladder = buildHintLadder(prompt);
    expect(ladder).not.toBeNull();
    expect(ladder!.l1).toContain("L1:");
    expect(ladder!.l2).toContain("L2:");
    expect(ladder!.l3).toContain("L3:");
  });

  it("includes the exact move in L3 (explicit hint)", () => {
    const prompt = makePrompt({ expectedMovesUsi: ["2g2f"] });
    const ladder = buildHintLadder(prompt);
    expect(ladder!.l3).toContain("2g2f");
  });

  it("handles drop moves", () => {
    const prompt = makePrompt({ expectedMovesUsi: ["P*5e"] });
    const ladder = buildHintLadder(prompt);
    expect(ladder).not.toBeNull();
    expect(ladder!.l1).toContain("歩");
    expect(ladder!.l2).toContain("歩");
  });

  it("handles promotion moves", () => {
    const prompt = makePrompt({ expectedMovesUsi: ["2b3c+"] });
    const ladder = buildHintLadder(prompt);
    expect(ladder).not.toBeNull();
    expect(ladder!.l1).toContain("成");
  });

  it("includes tag-based opening intent for 歩交換 tag", () => {
    const prompt = makePrompt({ tags: ["歩交換"], expectedMovesUsi: ["7g7f"] });
    const ladder = buildHintLadder(prompt);
    expect(ladder!.l1).toContain("歩交換");
  });

  it("includes tag-based opening intent for 囲い tag", () => {
    const prompt = makePrompt({ tags: ["囲い"], expectedMovesUsi: ["7g7f"] });
    const ladder = buildHintLadder(prompt);
    expect(ladder!.l1).toContain("安全度");
  });

  it("includes tag-based opening intent for テンポ tag", () => {
    const prompt = makePrompt({ tags: ["テンポ"], expectedMovesUsi: ["7g7f"] });
    const ladder = buildHintLadder(prompt);
    expect(ladder!.l1).toContain("速度勝負");
  });

  it("includes tag-based opening intent for 寄せ tag", () => {
    const prompt = makePrompt({ tags: ["寄せ"], expectedMovesUsi: ["7g7f"] });
    const ladder = buildHintLadder(prompt);
    expect(ladder!.l1).toContain("終盤入口");
  });

  it("includes tag-based opening intent for 矢倉 tag", () => {
    const prompt = makePrompt({ tags: ["矢倉"], expectedMovesUsi: ["7g7f"] });
    const ladder = buildHintLadder(prompt);
    expect(ladder!.l1).toContain("囲い");
  });
});

describe("resolveHintText", () => {
  const ladder: HintLadder = {
    l1: "L1: strategic hint",
    l2: "L2: practical hint",
    l3: "L3: 正解手は 7g7f です。",
  };

  it("returns null when ladder is null", () => {
    expect(resolveHintText(null, 1)).toBeNull();
  });

  it("returns null at level 0", () => {
    expect(resolveHintText(ladder, 0)).toBeNull();
  });

  it("returns l1 at level 1", () => {
    expect(resolveHintText(ladder, 1)).toBe(ladder.l1);
  });

  it("returns l2 at level 2", () => {
    expect(resolveHintText(ladder, 2)).toBe(ladder.l2);
  });

  it("returns l3 at level 3", () => {
    expect(resolveHintText(ladder, 3)).toBe(ladder.l3);
  });
});

describe("hintButtonLabel", () => {
  it("returns 'ヒントを見る' at level 0", () => {
    expect(hintButtonLabel(0)).toBe("ヒントを見る");
  });

  it("returns 'もっとヒント' at level 1", () => {
    expect(hintButtonLabel(1)).toBe("もっとヒント");
  });

  it("returns 'もっとヒント' at level 2", () => {
    expect(hintButtonLabel(2)).toBe("もっとヒント");
  });

  it("returns 'ヒントを隠す' at level 3", () => {
    expect(hintButtonLabel(3)).toBe("ヒントを隠す");
  });
});
