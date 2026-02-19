import type { ReviewCard, EaseStep } from "../types/index.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDaysToIso(isoString: string, days: number): string {
  const date = new Date(isoString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

// ─── intervalForEaseStep ────────────────────────────────────────────────────

const EASE_INTERVALS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export function intervalForEaseStep(easeStep: number): number {
  if (easeStep <= 0) return 0;
  if (easeStep >= 5) return 30;
  return EASE_INTERVALS[easeStep] ?? 0;
}

// ─── normalizeDailyTarget ───────────────────────────────────────────────────

export function normalizeDailyTarget(value: number): number {
  if (value === 10 || value === 20 || value === 30) return value;
  return 20;
}

// ─── updateReviewCard ───────────────────────────────────────────────────────

export function updateReviewCard(
  card: ReviewCard,
  isCorrect: boolean,
  nowIso: string
): ReviewCard {
  let newEaseStep: EaseStep;

  if (isCorrect) {
    newEaseStep = Math.min(card.easeStep + 1, 5) as EaseStep;
  } else {
    newEaseStep = Math.max(card.easeStep - 1, 1) as EaseStep;
  }

  const newIntervalDays = isCorrect ? intervalForEaseStep(newEaseStep) : 1;
  const newDueAt =
    newIntervalDays === 0 ? nowIso : addDaysToIso(nowIso, newIntervalDays);

  return {
    ...card,
    easeStep: newEaseStep,
    intervalDays: newIntervalDays,
    dueAt: newDueAt,
    lastResult: isCorrect ? "correct" : "incorrect",
    seenCount: card.seenCount + 1,
  };
}

// ─── composeSessionQueue ────────────────────────────────────────────────────

export function composeSessionQueue(
  due: string[],
  newCards: string[],
  target: number
): string[] {
  if (target <= 0) return [];

  const dueSlots = Math.round(target * 0.8);
  const newSlots = target - dueSlots;

  const pickedDue = due.slice(0, dueSlots);
  const pickedNew = newCards.slice(0, newSlots);

  // Handle overflow: if we picked fewer due than dueSlots, fill from newCards
  const dueLack = dueSlots - pickedDue.length;
  const newLack = newSlots - pickedNew.length;

  const extraFromNew =
    dueLack > 0 ? newCards.slice(newSlots, newSlots + dueLack) : [];
  const extraFromDue =
    newLack > 0 ? due.slice(dueSlots, dueSlots + newLack) : [];

  const queue = [
    ...pickedDue,
    ...extraFromDue,
    ...pickedNew,
    ...extraFromNew,
  ];

  return queue.slice(0, target);
}

// ─── composeMistakeFirstQueue ───────────────────────────────────────────────

export function composeMistakeFirstQueue(
  mistakes: string[],
  due: string[],
  newCards: string[],
  target: number
): string[] {
  if (mistakes.length === 0) {
    return composeSessionQueue(due, newCards, target);
  }

  // Deduplicate mistakes while preserving order
  const seen = new Set<string>();
  const uniqueMistakes: string[] = [];
  for (const id of mistakes) {
    if (!seen.has(id)) {
      seen.add(id);
      uniqueMistakes.push(id);
    }
  }

  const mistakeCount = Math.min(uniqueMistakes.length, target);
  const mistakePick = uniqueMistakes.slice(0, mistakeCount);
  const mistakeSet = new Set(mistakePick);

  const remainder = target - mistakePick.length;
  if (remainder <= 0) {
    return mistakePick.slice(0, target);
  }

  // Remove already-picked mistakes from due pool to avoid duplicates
  const filteredDue = due.filter((id) => !mistakeSet.has(id));
  const remainderQueue = composeSessionQueue(filteredDue, newCards, remainder);

  return [...mistakePick, ...remainderQueue];
}

// ─── calculateStreak ────────────────────────────────────────────────────────

export function calculateStreak(sessionDates: string[], today: string): number {
  if (sessionDates.length === 0) return 0;

  const dateSet = new Set(sessionDates);
  if (!dateSet.has(today)) return 0;

  let streak = 0;
  let current = new Date(today + "T00:00:00Z");

  while (true) {
    const dateStr = current.toISOString().slice(0, 10);
    if (!dateSet.has(dateStr)) break;
    streak++;
    current.setUTCDate(current.getUTCDate() - 1);
  }

  return streak;
}

// ─── rankLabel ──────────────────────────────────────────────────────────────

export function rankLabel(masteredCards: number): string {
  if (masteredCards >= 180) return "初段";
  if (masteredCards >= 120) return "2級";
  if (masteredCards >= 80) return "4級";
  if (masteredCards >= 50) return "6級";
  if (masteredCards >= 30) return "8級";
  if (masteredCards >= 15) return "10級";
  return "入門";
}
