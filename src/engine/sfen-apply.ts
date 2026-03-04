import type { Owner, PieceType, Square } from "../types/index.ts";
import { parseSfen } from "./sfen.ts";
import { usiSquareToCoord } from "../utils/coord.ts";

// ─── applyUsiMove ──────────────────────────────────────────────────────────
// Applies a USI move to an SFEN string and returns the resulting SFEN.
// Handles board moves, promotions, captures, and drops.

export function applyUsiMove(sfen: string, usi: string): string {
  const parsed = parseSfen(sfen);
  const board: (Square)[][] = parsed.board.map((row) => [...row]);
  const hands: Record<Owner, Record<PieceType, number>> = {
    sente: { ...parsed.hands.sente },
    gote: { ...parsed.hands.gote },
  };
  const side = parsed.sideToMove;

  const parts = sfen.trim().split(/\s+/);
  const moveNum = parseInt(parts[3] ?? "1", 10);

  if (usi.length >= 4 && usi[1] === "*") {
    // Drop move: P*5e
    const pieceType = usi[0].toUpperCase() as PieceType;
    const toCoord = usiSquareToCoord(usi.slice(2, 4));
    if (!toCoord) throw new Error(`Invalid drop target: ${usi}`);

    if (hands[side][pieceType] <= 0) {
      throw new Error(`No ${pieceType} in ${side}'s hand to drop`);
    }

    hands[side][pieceType] -= 1;
    board[toCoord.row][toCoord.col] = {
      owner: side,
      pieceType,
      promoted: false,
      piece: pieceType,
    };
  } else {
    // Board move: 7g7f or 7g7f+
    const fromCoord = usiSquareToCoord(usi.slice(0, 2));
    const toCoord = usiSquareToCoord(usi.slice(2, 4));
    if (!fromCoord || !toCoord) throw new Error(`Invalid move coordinates: ${usi}`);
    const promote = usi.length === 5 && usi[4] === "+";

    const piece = board[fromCoord.row][fromCoord.col];
    if (!piece) {
      throw new Error(`No piece at ${usi.slice(0, 2)} for move ${usi}`);
    }

    // Handle capture
    const target = board[toCoord.row][toCoord.col];
    if (target && target.owner !== side) {
      const capturedType = target.pieceType;
      hands[side][capturedType] += 1;
    }

    // Move piece
    board[fromCoord.row][fromCoord.col] = null;
    board[toCoord.row][toCoord.col] = {
      owner: piece.owner,
      pieceType: piece.pieceType,
      promoted: promote ? true : piece.promoted,
      piece: piece.piece,
    };
  }

  // Switch side; SFEN move number increments after every ply
  const nextSide: Owner = side === "sente" ? "gote" : "sente";
  const nextMoveNum = moveNum + 1;

  return serializeSfen(board, nextSide, hands, nextMoveNum);
}

// ─── serializeSfen ─────────────────────────────────────────────────────────

function serializeSfen(
  board: (Square)[][],
  sideToMove: Owner,
  hands: Record<Owner, Record<PieceType, number>>,
  moveNum: number,
): string {
  const boardStr = serializeBoard(board);
  const sideStr = sideToMove === "sente" ? "b" : "w";
  const handStr = serializeHands(hands);
  return `${boardStr} ${sideStr} ${handStr} ${moveNum}`;
}

function serializeBoard(board: (Square)[][]): string {
  const rows: string[] = [];

  for (let r = 0; r < 9; r++) {
    let rowStr = "";
    let emptyCount = 0;

    for (let c = 0; c < 9; c++) {
      const sq = board[r][c];
      if (sq === null || sq === undefined) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += String(emptyCount);
          emptyCount = 0;
        }
        const letter = sq.owner === "sente"
          ? sq.pieceType.toUpperCase()
          : sq.pieceType.toLowerCase();
        rowStr += sq.promoted ? `+${letter}` : letter;
      }
    }

    if (emptyCount > 0) {
      rowStr += String(emptyCount);
    }
    rows.push(rowStr);
  }

  return rows.join("/");
}

const HAND_ORDER: PieceType[] = ["R", "B", "G", "S", "N", "L", "P"];

function serializeHands(
  hands: Record<Owner, Record<PieceType, number>>,
): string {
  let result = "";

  for (const pt of HAND_ORDER) {
    const count = hands.sente[pt];
    if (count > 0) {
      result += count > 1 ? `${count}${pt}` : pt;
    }
  }
  for (const pt of HAND_ORDER) {
    const count = hands.gote[pt];
    if (count > 0) {
      const letter = pt.toLowerCase();
      result += count > 1 ? `${count}${letter}` : letter;
    }
  }

  return result === "" ? "-" : result;
}
