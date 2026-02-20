import { create } from "zustand";
import type { ReviewCard, PromptNode, MoveResult } from "../types/index.ts";
import { updateReviewCard, composeMistakeFirstQueue } from "../engine/srs.ts";
import { normalizeUsiMove, isValidUsiMove } from "../engine/move-validation.ts";

type SessionState = {
  readonly queue: readonly string[];
  readonly currentIndex: number;
  readonly mistakes: string[];
  readonly correctCount: number;
  readonly reviewedCount: number;
  readonly active: boolean;
};

type SessionActions = {
  readonly startSession: (queue: string[]) => void;
  readonly submitMove: (
    usi: string,
    prompt: PromptNode,
    existingCard: ReviewCard | undefined,
  ) => MoveResult;
  readonly advance: () => PromptNode | null;
  readonly reset: () => void;
  readonly currentNodeId: () => string | null;
};

const INITIAL_STATE: SessionState = {
  queue: [],
  currentIndex: 0,
  mistakes: [],
  correctCount: 0,
  reviewedCount: 0,
  active: false,
};

export const useSessionStore = create<SessionState & SessionActions>((set, get) => ({
  ...INITIAL_STATE,

  startSession: (queue) => {
    set({
      queue,
      currentIndex: 0,
      mistakes: [],
      correctCount: 0,
      reviewedCount: 0,
      active: true,
    });
  },

  submitMove: (usi, prompt, existingCard) => {
    const state = get();
    const normalized = normalizeUsiMove(usi);

    if (!isValidUsiMove(normalized)) {
      return {
        isCorrect: false,
        expectedUsi: prompt.expectedMovesUsi[0] ?? "",
        nextPromptNodeId: null,
        reviewCardUpdate: existingCard ?? makeNewCard(prompt),
        sessionCompleted: false,
        completedCards: state.reviewedCount,
        totalCards: state.queue.length,
        invalidInput: true,
      };
    }

    const isCorrect = prompt.expectedMovesUsi
      .map((m) => normalizeUsiMove(m))
      .includes(normalized);

    const now = new Date().toISOString();
    const card = existingCard ?? makeNewCard(prompt);
    const updatedCard = updateReviewCard(card, isCorrect, now);

    const newMistakes = isCorrect
      ? state.mistakes
      : [...state.mistakes, prompt.nodeId];

    if (isCorrect) {
      const newReviewedCount = state.reviewedCount + 1;
      const sessionCompleted = state.currentIndex >= state.queue.length - 1;

      set({
        reviewedCount: newReviewedCount,
        correctCount: state.correctCount + 1,
        mistakes: newMistakes,
        active: !sessionCompleted,
      });

      return {
        isCorrect: true,
        expectedUsi: prompt.expectedMovesUsi[0] ?? "",
        nextPromptNodeId: null,
        reviewCardUpdate: updatedCard,
        sessionCompleted,
        completedCards: newReviewedCount,
        totalCards: state.queue.length,
        invalidInput: false,
      };
    }

    // Incorrect: don't advance reviewedCount or currentIndex
    set({ mistakes: newMistakes });

    return {
      isCorrect: false,
      expectedUsi: prompt.expectedMovesUsi[0] ?? "",
      nextPromptNodeId: null,
      reviewCardUpdate: updatedCard,
      sessionCompleted: false,
      completedCards: state.reviewedCount,
      totalCards: state.queue.length,
      invalidInput: false,
    };
  },

  advance: () => {
    const state = get();
    const nextIndex = state.currentIndex + 1;
    if (nextIndex >= state.queue.length) {
      set({ active: false });
      return null;
    }
    set({ currentIndex: nextIndex });
    return null; // caller resolves the prompt from catalog store
  },

  reset: () => set(INITIAL_STATE),

  currentNodeId: () => {
    const { queue, currentIndex, active } = get();
    if (!active || currentIndex >= queue.length) return null;
    return queue[currentIndex] ?? null;
  },
}));

function makeNewCard(prompt: PromptNode): ReviewCard {
  return {
    nodeId: prompt.nodeId,
    openingFamilyId: prompt.openingFamilyId,
    intervalDays: 0,
    dueAt: new Date().toISOString(),
    easeStep: 0,
    lastResult: "unseen",
    seenCount: 0,
  };
}
