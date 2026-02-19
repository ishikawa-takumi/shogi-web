export type SidePreference = "sente" | "gote" | "both";

export type UserSettings = {
  readonly dailyTarget: 10 | 20 | 30;
  readonly sidePreference: SidePreference;
  readonly selectedFamilyIds: readonly string[];
  readonly onboarded: boolean;
};

export type OpeningMastery = {
  readonly openingFamilyId: string;
  readonly openingNameJa: string;
  readonly masteredCards: number;
  readonly totalCards: number;
  readonly masteryPercent: number;
};

export type DashboardState = {
  readonly dueCount: number;
  readonly streak: number;
  readonly rankLabel: string;
  readonly masteredCards: number;
  readonly totalCards: number;
  readonly openingMastery: readonly OpeningMastery[];
};
