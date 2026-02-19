import type { SessionHistoryEntry } from "../types/index.ts";
import { db, type SessionHistoryRow } from "./schema.ts";

function rowToEntry(row: SessionHistoryRow): SessionHistoryEntry {
  return {
    id: row.id,
    sessionDate: row.sessionDate,
    reviewedCount: row.reviewedCount,
    correctCount: row.correctCount,
  };
}

export async function appendSessionHistory(
  sessionDate: string,
  reviewedCount: number,
  correctCount: number,
): Promise<void> {
  await db.sessionHistory.add({
    sessionDate,
    reviewedCount,
    correctCount,
    createdAt: new Date().toISOString(),
  });
}

export async function listSessionHistory(): Promise<SessionHistoryEntry[]> {
  const rows = await db.sessionHistory.orderBy("sessionDate").toArray();
  return rows.map(rowToEntry);
}

export async function sessionDates(): Promise<string[]> {
  const entries = await listSessionHistory();
  return [...new Set(entries.map((e) => e.sessionDate))];
}

export async function clearSessionHistory(): Promise<void> {
  await db.sessionHistory.clear();
}
