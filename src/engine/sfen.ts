import type { Square, Owner, PieceType, HandPieces, ParsedSfen } from "../types/index.ts";
import { BASE_LABELS, PROMOTED_LABELS } from "../utils/piece-labels.ts";

const PIECE_TYPES: PieceType[] = ["P", "L", "N", "S", "G", "B", "R", "K"];

function emptyHand(): HandPieces {
  return Object.fromEntries(PIECE_TYPES.map((pt) => [pt, 0])) as HandPieces;
}

function parseBoard(boardPart: string): readonly (readonly Square[])[] {
  const rowStrings = boardPart.split("/");

  const rows: (readonly Square[])[] = [];

  for (let r = 0; r < 9; r++) {
    const rowStr = rowStrings[r] ?? "";
    const squares: Square[] = [];
    let i = 0;

    while (i < rowStr.length) {
      const ch = rowStr[i];

      if (ch === "+") {
        const next = rowStr[i + 1];
        const upper = next.toUpperCase() as PieceType;
        const owner: Owner = next === next.toUpperCase() ? "sente" : "gote";
        const pieceLabel = PROMOTED_LABELS[upper] ?? BASE_LABELS[upper] ?? upper;
        squares.push({
          owner,
          pieceType: upper,
          promoted: true,
          piece: pieceLabel,
        });
        i += 2;
      } else if (ch >= "1" && ch <= "9") {
        const count = parseInt(ch, 10);
        for (let k = 0; k < count; k++) {
          squares.push(null);
        }
        i += 1;
      } else {
        const upper = ch.toUpperCase() as PieceType;
        const owner: Owner = ch === ch.toUpperCase() ? "sente" : "gote";
        const pieceLabel = BASE_LABELS[upper] ?? upper;
        squares.push({
          owner,
          pieceType: upper,
          promoted: false,
          piece: pieceLabel,
        });
        i += 1;
      }
    }

    // Pad row to 9 columns
    while (squares.length < 9) {
      squares.push(null);
    }

    rows.push(squares);
  }

  // Pad board to 9 rows
  while (rows.length < 9) {
    rows.push(Array<Square>(9).fill(null));
  }

  return rows;
}

function parseHands(handPart: string): { sente: HandPieces; gote: HandPieces } {
  const sente = emptyHand();
  const gote = emptyHand();

  if (handPart === "-") {
    return { sente, gote };
  }

  // Pattern: optional digits followed by a piece letter
  const regex = /(\d*)([PLNSGBRKplnsgbrk])/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(handPart)) !== null) {
    const countStr = match[1];
    const letter = match[2];
    const count = countStr === "" ? 1 : parseInt(countStr, 10);
    const upper = letter.toUpperCase() as PieceType;

    if (letter === letter.toUpperCase()) {
      (sente as Record<string, number>)[upper] += count;
    } else {
      (gote as Record<string, number>)[upper] += count;
    }
  }

  return { sente, gote };
}

export function parseSfen(sfen: string): ParsedSfen {
  const parts = sfen.trim().split(/\s+/);
  if (parts.length < 3) {
    throw new Error(`Invalid SFEN: expected at least 3 parts, got ${parts.length}`);
  }
  const boardPart = parts[0] ?? "";
  const rowStrings = boardPart.split("/");
  if (rowStrings.length !== 9) {
    throw new Error(`Invalid SFEN board: expected 9 rows, got ${rowStrings.length}`);
  }
  const sidePart = parts[1] ?? "b";
  const handPart = parts[2] ?? "-";

  const board = parseBoard(boardPart);

  const sideToMove: Owner = sidePart === "b" ? "sente" : "gote";

  const hands = parseHands(handPart);

  return {
    board,
    sideToMove,
    hands,
  };
}
