import Dexie, { type EntityTable } from "dexie";

export type ReviewCardRow = {
  nodeId: string;
  openingFamilyId: string;
  intervalDays: number;
  dueAt: string;
  easeStep: number;
  lastResult: string;
  seenCount: number;
  updatedAt: string;
};

export type SessionHistoryRow = {
  id?: number;
  sessionDate: string;
  reviewedCount: number;
  correctCount: number;
  createdAt: string;
};

export type SettingsRow = {
  id: number;
  dailyTarget: number;
  sidePreference: string;
  selectedFamilyIds: string;
  onboarded: number;
  updatedAt: string;
};

export class ShogiDB extends Dexie {
  reviewCards!: EntityTable<ReviewCardRow, "nodeId">;
  sessionHistory!: EntityTable<SessionHistoryRow, "id">;
  settings!: EntityTable<SettingsRow, "id">;

  constructor() {
    super("shogi-trainer");
    this.version(1).stores({
      reviewCards: "nodeId, openingFamilyId, dueAt",
      sessionHistory: "++id, sessionDate",
      settings: "id",
    });
  }
}

export const db = new ShogiDB();
