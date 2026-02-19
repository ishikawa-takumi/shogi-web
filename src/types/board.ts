export type Owner = "sente" | "gote";
export type PieceType = "P" | "L" | "N" | "S" | "G" | "B" | "R" | "K";

export type Square = {
  readonly owner: Owner;
  readonly pieceType: PieceType;
  readonly promoted: boolean;
  readonly piece: string;
} | null;

export type HandPieces = Readonly<Record<PieceType, number>>;

export type ParsedSfen = {
  readonly board: readonly (readonly Square[])[];
  readonly sideToMove: Owner;
  readonly hands: {
    readonly sente: HandPieces;
    readonly gote: HandPieces;
  };
};

export type Coord = { readonly row: number; readonly col: number };

export type HintLevel = 0 | 1 | 2 | 3;

export type HintLadder = {
  readonly l1: string;
  readonly l2: string;
  readonly l3: string;
};
