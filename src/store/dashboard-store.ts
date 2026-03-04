import { create } from "zustand";
import type { DashboardState, OpeningMastery, ReviewCard, OpeningFamily } from "../types/index.ts";
import { calculateStreak, rankLabel, MASTERY_THRESHOLD } from "../engine/srs.ts";
import { sessionDates } from "../db/session-history.ts";
import { todayString } from "../utils/date.ts";

type DashboardActions = {
  readonly compute: (
    cards: readonly ReviewCard[],
    families: readonly OpeningFamily[],
  ) => Promise<void>;
};

const INITIAL: DashboardState = {
  dueCount: 0,
  streak: 0,
  rankLabel: "入門",
  masteredCards: 0,
  totalCards: 0,
  openingMastery: [],
};

export const useDashboardStore = create<DashboardState & DashboardActions>((set) => ({
  ...INITIAL,

  compute: async (cards, families) => {
    const now = new Date();
    const dueCount = cards.filter((c) => new Date(c.dueAt) <= now).length;
    const masteredCards = cards.filter((c) => c.easeStep >= MASTERY_THRESHOLD).length;
    const totalCards = cards.length;

    const dates = await sessionDates();
    const streak = calculateStreak(dates, todayString());
    const rank = rankLabel(masteredCards);

    const openingMastery: OpeningMastery[] = families.map((family) => {
      const familyCards = cards.filter((c) => c.openingFamilyId === family.id);
      const mastered = familyCards.filter((c) => c.easeStep >= MASTERY_THRESHOLD).length;
      const total = familyCards.length;
      return {
        openingFamilyId: family.id,
        openingNameJa: family.nameJa,
        masteredCards: mastered,
        totalCards: total,
        masteryPercent: total > 0 ? Math.round((mastered / total) * 100) : 0,
      };
    });

    set({
      dueCount,
      streak,
      rankLabel: rank,
      masteredCards,
      totalCards,
      openingMastery,
    });
  },
}));
