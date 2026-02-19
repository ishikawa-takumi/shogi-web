export const PIECE_LABELS: Record<string, string> = {
  P: "歩",
  L: "香",
  N: "桂",
  S: "銀",
  G: "金",
  B: "角",
  R: "飛",
  K: "玉",
  "+P": "と",
  "+L": "杏",
  "+N": "圭",
  "+S": "全",
  "+B": "馬",
  "+R": "龍",
};

export function pieceToJapanese(piece: string): string {
  return PIECE_LABELS[piece] ?? piece;
}
