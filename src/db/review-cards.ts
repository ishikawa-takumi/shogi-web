import type { ReviewCard, EaseStep, ReviewResult } from "../types/index.ts";
import { db, type ReviewCardRow } from "./schema.ts";

function rowToCard(row: ReviewCardRow): ReviewCard {
  return {
    nodeId: row.nodeId,
    openingFamilyId: row.openingFamilyId,
    intervalDays: row.intervalDays,
    dueAt: row.dueAt,
    easeStep: row.easeStep as EaseStep,
    lastResult: row.lastResult as ReviewResult,
    seenCount: row.seenCount,
  };
}

function cardToRow(card: ReviewCard): ReviewCardRow {
  return {
    nodeId: card.nodeId,
    openingFamilyId: card.openingFamilyId,
    intervalDays: card.intervalDays,
    dueAt: card.dueAt,
    easeStep: card.easeStep,
    lastResult: card.lastResult,
    seenCount: card.seenCount,
    updatedAt: new Date().toISOString(),
  };
}

export async function listReviewCards(): Promise<ReviewCard[]> {
  const rows = await db.reviewCards.toArray();
  return rows.map(rowToCard);
}

export async function getReviewCard(nodeId: string): Promise<ReviewCard | undefined> {
  const row = await db.reviewCards.get(nodeId);
  return row ? rowToCard(row) : undefined;
}

export async function upsertReviewCard(card: ReviewCard): Promise<void> {
  await db.reviewCards.put(cardToRow(card));
}

export async function bulkPutReviewCards(cards: readonly ReviewCard[]): Promise<void> {
  await db.reviewCards.bulkPut(cards.map(cardToRow));
}

export async function clearReviewCards(): Promise<void> {
  await db.reviewCards.clear();
}
