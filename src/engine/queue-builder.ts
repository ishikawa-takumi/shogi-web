import type { MoveNode, ReviewCard, SidePreference } from "../types/index.ts";
import { composeMistakeFirstQueue } from "./srs.ts";
import { matchesSidePreference } from "./session.ts";

export function buildSessionQueue(input: {
  readonly allNodes: readonly MoveNode[];
  readonly cards: readonly ReviewCard[];
  readonly selectedFamilyIds: readonly string[];
  readonly sidePreference: SidePreference;
  readonly dailyTarget: number;
}): readonly string[] {
  const { allNodes, cards, selectedFamilyIds, sidePreference, dailyTarget } = input;
  const now = new Date();
  const selectedSet = new Set(selectedFamilyIds);

  const eligible = allNodes.filter(
    (n) => selectedSet.has(n.openingFamilyId) && matchesSidePreference(sidePreference, n.sideToMove),
  );

  const cardMap = new Map(cards.map((c) => [c.nodeId, c]));

  const dueIds: string[] = [];
  const rawNewIds: string[] = [];
  const mistakeIds: string[] = [];

  for (const node of eligible) {
    const card = cardMap.get(node.id);
    if (!card) {
      rawNewIds.push(node.id);
      continue;
    }
    if (card.lastResult === "incorrect") {
      mistakeIds.push(node.id);
    }
    if (new Date(card.dueAt) <= now) {
      dueIds.push(node.id);
    }
  }

  // For sequential opening lines, only include a new node if its predecessor
  // has been seen before or is already in this session's queue.
  const inQueue = new Set([...dueIds, ...mistakeIds]);
  const newIds: string[] = [];

  for (const id of rawNewIds) {
    const predecessor = allNodes.find((n) => n.nextNodeId === id);
    if (!predecessor || cardMap.has(predecessor.id) || inQueue.has(predecessor.id)) {
      newIds.push(id);
      inQueue.add(id);
    }
  }

  return composeMistakeFirstQueue(mistakeIds, dueIds, newIds, dailyTarget);
}
