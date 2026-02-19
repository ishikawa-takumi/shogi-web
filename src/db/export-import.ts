import type { ExportBlob, ImportResult, UserSettings, ReviewCard } from "../types/index.ts";
import { listReviewCards, clearReviewCards, bulkPutReviewCards } from "./review-cards.ts";
import { listSessionHistory, clearSessionHistory, appendSessionHistory } from "./session-history.ts";
import { saveSettings } from "./settings.ts";
import { normalizeDailyTarget } from "../engine/srs.ts";
import { sanitizeFamilyIds } from "../engine/session.ts";

export async function exportProgress(settings: UserSettings): Promise<ExportBlob> {
  const reviewCards = await listReviewCards();
  const sessionHistory = await listSessionHistory();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    reviewCards,
    sessionHistory,
  };
}

export async function importProgress(
  blob: ExportBlob,
  allFamilyIds: readonly string[],
): Promise<ImportResult> {
  if (blob.version !== 1) {
    throw new Error(`対応していないエクスポート形式です: v${blob.version}`);
  }

  await clearReviewCards();
  await clearSessionHistory();

  const sanitizedSettings: UserSettings = {
    dailyTarget: normalizeDailyTarget(blob.settings.dailyTarget) as 10 | 20 | 30,
    sidePreference: blob.settings.sidePreference,
    selectedFamilyIds: sanitizeFamilyIds(
      [...blob.settings.selectedFamilyIds],
      [...allFamilyIds],
    ),
    onboarded: blob.settings.onboarded,
  };
  await saveSettings(sanitizedSettings);

  const allowedSet = new Set(allFamilyIds);
  const validCards: ReviewCard[] = [];
  let skippedInvalidCards = 0;

  for (const card of blob.reviewCards) {
    if (allowedSet.has(card.openingFamilyId)) {
      validCards.push(card);
    } else {
      skippedInvalidCards++;
    }
  }

  await bulkPutReviewCards(validCards);

  let importedSessions = 0;
  for (const entry of blob.sessionHistory) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry.sessionDate)) {
      await appendSessionHistory(entry.sessionDate, entry.reviewedCount, entry.correctCount);
      importedSessions++;
    }
  }

  return {
    importedCards: validCards.length,
    importedSessions,
    skippedInvalidCards,
  };
}
