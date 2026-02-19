import { create } from "zustand";
import type { ReviewCard } from "../types/index.ts";
import { listReviewCards, upsertReviewCard } from "../db/review-cards.ts";

type ReviewState = {
  readonly cards: readonly ReviewCard[];
  readonly loaded: boolean;
};

type ReviewActions = {
  readonly load: () => Promise<void>;
  readonly upsert: (card: ReviewCard) => Promise<void>;
  readonly isDue: (nodeId: string, now?: Date) => boolean;
  readonly dueCards: () => ReviewCard[];
  readonly masteredCount: () => number;
};

export const useReviewStore = create<ReviewState & ReviewActions>((set, get) => ({
  cards: [],
  loaded: false,

  load: async () => {
    const cards = await listReviewCards();
    set({ cards, loaded: true });
  },

  upsert: async (card) => {
    await upsertReviewCard(card);
    const existing = get().cards;
    const idx = existing.findIndex((c) => c.nodeId === card.nodeId);
    const updated =
      idx >= 0
        ? [...existing.slice(0, idx), card, ...existing.slice(idx + 1)]
        : [...existing, card];
    set({ cards: updated });
  },

  isDue: (nodeId, now = new Date()) => {
    const card = get().cards.find((c) => c.nodeId === nodeId);
    if (!card) return false;
    return new Date(card.dueAt) <= now;
  },

  dueCards: () => {
    const now = new Date();
    return get().cards.filter((c) => new Date(c.dueAt) <= now);
  },

  masteredCount: () =>
    get().cards.filter((c) => c.easeStep >= 4).length,
}));
