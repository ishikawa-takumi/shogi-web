import { describe, it, expect } from "vitest";
import {
  intervalForEaseStep,
  normalizeDailyTarget,
  updateReviewCard,
  composeSessionQueue,
  composeMistakeFirstQueue,
  calculateStreak,
  rankLabel,
} from "../../src/engine/srs.ts";
import type { ReviewCard } from "../../src/types/index.ts";

function baseCard(): ReviewCard {
  return {
    nodeId: "n1",
    openingFamilyId: "f1",
    intervalDays: 0,
    dueAt: "2026-01-01T00:00:00+09:00",
    easeStep: 0,
    lastResult: "unseen",
    seenCount: 0,
  };
}

describe("intervalForEaseStep", () => {
  it("returns 0 for ease step 0", () => {
    expect(intervalForEaseStep(0)).toBe(0);
  });

  it("returns correct intervals for each step", () => {
    expect(intervalForEaseStep(1)).toBe(1);
    expect(intervalForEaseStep(2)).toBe(3);
    expect(intervalForEaseStep(3)).toBe(7);
    expect(intervalForEaseStep(4)).toBe(14);
    expect(intervalForEaseStep(5)).toBe(30);
  });
});

describe("normalizeDailyTarget", () => {
  it("passes through valid targets", () => {
    expect(normalizeDailyTarget(10)).toBe(10);
    expect(normalizeDailyTarget(20)).toBe(20);
    expect(normalizeDailyTarget(30)).toBe(30);
  });

  it("defaults invalid targets to 20", () => {
    expect(normalizeDailyTarget(15)).toBe(20);
    expect(normalizeDailyTarget(0)).toBe(20);
    expect(normalizeDailyTarget(99)).toBe(20);
  });
});

describe("updateReviewCard", () => {
  it("advances interval on correct", () => {
    const updated = updateReviewCard(baseCard(), true, "2026-01-01T00:00:00+09:00");
    expect(updated.easeStep).toBe(1);
    expect(updated.intervalDays).toBe(1);
    expect(updated.lastResult).toBe("correct");
    expect(updated.seenCount).toBe(1);
  });

  it("resets interval on incorrect", () => {
    const card: ReviewCard = { ...baseCard(), easeStep: 4, intervalDays: 14 };
    const updated = updateReviewCard(card, false, "2026-01-01T00:00:00+09:00");
    expect(updated.easeStep).toBe(3);
    expect(updated.intervalDays).toBe(1);
    expect(updated.lastResult).toBe("incorrect");
    expect(updated.seenCount).toBe(1);
  });

  it("does not exceed max ease step 5", () => {
    const card: ReviewCard = { ...baseCard(), easeStep: 5 };
    const updated = updateReviewCard(card, true, "2026-01-01T00:00:00+09:00");
    expect(updated.easeStep).toBe(5);
    expect(updated.intervalDays).toBe(30);
  });

  it("does not go below ease step 1 on incorrect", () => {
    const card: ReviewCard = { ...baseCard(), easeStep: 1 };
    const updated = updateReviewCard(card, false, "2026-01-01T00:00:00+09:00");
    expect(updated.easeStep).toBe(1);
    expect(updated.intervalDays).toBe(1);
  });

  it("returns a new object (immutable)", () => {
    const original = baseCard();
    const updated = updateReviewCard(original, true, "2026-01-01T00:00:00+09:00");
    expect(updated).not.toBe(original);
    expect(original.easeStep).toBe(0);
  });
});

describe("composeSessionQueue", () => {
  it("composes due-first queue (80% due, 20% new)", () => {
    const due = ["d1", "d2", "d3"];
    const newCards = ["n1", "n2", "n3"];
    const queue = composeSessionQueue(due, newCards, 5);
    expect(queue.length).toBe(5);
    expect(queue[0]).toBe("d1");
  });

  it("fills from new when not enough due", () => {
    const due = ["d1"];
    const newCards = ["n1", "n2", "n3"];
    const queue = composeSessionQueue(due, newCards, 3);
    expect(queue.length).toBe(3);
    expect(queue).toContain("d1");
    expect(queue).toContain("n1");
    expect(queue).toContain("n2");
  });

  it("returns empty for target 0", () => {
    expect(composeSessionQueue(["d1"], ["n1"], 0)).toEqual([]);
  });
});

describe("composeMistakeFirstQueue", () => {
  it("prioritizes mistakes before due and new", () => {
    const mistakes = ["m1", "m2"];
    const due = ["d1", "m1", "d2"];
    const newCards = ["n1", "n2"];
    const queue = composeMistakeFirstQueue(mistakes, due, newCards, 5);
    expect(queue.length).toBe(5);
    expect(queue[0]).toBe("m1");
    expect(queue[1]).toBe("m2");
    expect(queue).toContain("d1");
    expect(queue).toContain("n1");
  });

  it("falls back to default when no mistakes", () => {
    const due = ["d1", "d2", "d3"];
    const newCards = ["n1", "n2"];
    const queue = composeMistakeFirstQueue([], due, newCards, 4);
    expect(queue).toEqual(composeSessionQueue(due, newCards, 4));
  });

  it("deduplicates mistake IDs", () => {
    const mistakes = ["m1", "m1", "m2"];
    const queue = composeMistakeFirstQueue(mistakes, [], [], 3);
    expect(queue.filter((id) => id === "m1").length).toBe(1);
  });
});

describe("calculateStreak", () => {
  it("calculates streak with gaps", () => {
    const dates = ["2026-02-10", "2026-02-13", "2026-02-14", "2026-02-15"];
    const streak = calculateStreak(dates, "2026-02-15");
    expect(streak).toBe(3);
  });

  it("returns 0 for empty dates", () => {
    expect(calculateStreak([], "2026-02-15")).toBe(0);
  });

  it("returns 0 when today is not in dates", () => {
    const dates = ["2026-02-10", "2026-02-11"];
    expect(calculateStreak(dates, "2026-02-15")).toBe(0);
  });

  it("handles single day streak", () => {
    expect(calculateStreak(["2026-02-15"], "2026-02-15")).toBe(1);
  });
});

describe("rankLabel", () => {
  it("returns 入門 for low counts", () => {
    expect(rankLabel(0)).toBe("入門");
    expect(rankLabel(14)).toBe("入門");
  });

  it("returns correct rank progression", () => {
    expect(rankLabel(15)).toBe("10級");
    expect(rankLabel(30)).toBe("8級");
    expect(rankLabel(50)).toBe("6級");
    expect(rankLabel(80)).toBe("4級");
    expect(rankLabel(120)).toBe("2級");
    expect(rankLabel(180)).toBe("初段");
  });
});
