export type Difficulty = "beginner" | "intermediate";
export type SideToMove = "sente" | "gote";

export type OpeningCatalog = {
  readonly schemaVersion: number;
  readonly families: readonly OpeningFamily[];
  readonly lines: readonly OpeningLine[];
  readonly nodes: readonly MoveNode[];
};

export type OpeningFamily = {
  readonly id: string;
  readonly nameJa: string;
  readonly difficulty: Difficulty;
  readonly lineIds: readonly string[];
};

export type OpeningLine = {
  readonly id: string;
  readonly familyId: string;
  readonly nameJa: string;
  readonly rootNodeId: string;
  readonly nodeIds: readonly string[];
};

export type MoveNode = {
  readonly id: string;
  readonly openingFamilyId: string;
  readonly lineId: string;
  readonly sfen: string;
  readonly sideToMove: SideToMove;
  readonly expectedMovesUsi: readonly string[];
  readonly opponentAutoResponseUsi: string | null;
  readonly nextNodeId: string | null;
  readonly tags: readonly string[];
  readonly moveIndex: number;
  readonly teachingComment: string | null;
};

export type PromptNode = {
  readonly nodeId: string;
  readonly openingFamilyId: string;
  readonly openingNameJa: string;
  readonly sfen: string;
  readonly sideToMove: SideToMove;
  readonly expectedMovesUsi: readonly string[];
  readonly tags: readonly string[];
  readonly moveIndex: number;
  readonly teachingComment: string | null;
};

export type ContentValidationIssue = {
  readonly message: string;
  readonly nodeId: string | null;
  readonly lineId: string | null;
  readonly familyId: string | null;
};

export type ContentValidationReport = {
  readonly isValid: boolean;
  readonly issueCount: number;
  readonly issues: readonly ContentValidationIssue[];
};
