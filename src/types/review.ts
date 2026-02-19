export type ReviewResult = "correct" | "incorrect" | "unseen";
export type EaseStep = 0 | 1 | 2 | 3 | 4 | 5;

export type ReviewCard = {
  readonly nodeId: string;
  readonly openingFamilyId: string;
  readonly intervalDays: number;
  readonly dueAt: string;
  readonly easeStep: EaseStep;
  readonly lastResult: ReviewResult;
  readonly seenCount: number;
};

export type SessionConfig = {
  readonly dailyTarget: number;
  readonly sidePreference: "sente" | "gote" | "both";
  readonly selectedFamilyIds?: readonly string[];
};

export type SessionHistoryEntry = {
  readonly id?: number;
  readonly sessionDate: string;
  readonly reviewedCount: number;
  readonly correctCount: number;
};

export type MoveResult = {
  readonly isCorrect: boolean;
  readonly expectedUsi: string;
  readonly nextPromptNodeId: string | null;
  readonly reviewCardUpdate: ReviewCard;
  readonly sessionCompleted: boolean;
  readonly completedCards: number;
  readonly totalCards: number;
  readonly invalidInput: boolean;
};

export type ExportBlob = {
  readonly version: number;
  readonly exportedAt: string;
  readonly settings: import("./dashboard.ts").UserSettings;
  readonly reviewCards: readonly ReviewCard[];
  readonly sessionHistory: readonly SessionHistoryEntry[];
};

export type ImportResult = {
  readonly importedCards: number;
  readonly importedSessions: number;
  readonly skippedInvalidCards: number;
};
