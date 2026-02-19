import type { Square, Owner, PieceType, Coord } from "../types/index.ts";

// ---------------------------------------------------------------------------
// 1. USI move normalization
// ---------------------------------------------------------------------------

export function normalizeUsiMove(input: string): string {
  return input.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// 2. USI move validation
// ---------------------------------------------------------------------------

// Normal move: file(1-9) rank(a-i) file(1-9) rank(a-i) [+]
const NORMAL_MOVE_RE = /^[1-9][a-i][1-9][a-i]\+?$/i;

// Drop move: piece(P/L/N/S/G/B/R/K) * file(1-9) rank(a-i)
const DROP_MOVE_RE = /^[plnsgbrk]\*[1-9][a-i]$/i;

export function isValidUsiMove(input: string): boolean {
  return NORMAL_MOVE_RE.test(input) || DROP_MOVE_RE.test(input);
}

// ---------------------------------------------------------------------------
// 3. Legal destinations
// ---------------------------------------------------------------------------

type Board = readonly (readonly Square[])[];

/** Returns true when coord is inside a 9x9 board */
function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 9 && col >= 0 && col < 9;
}

/**
 * Collect all squares reachable by sliding in direction [dr, dc].
 * Stops before a friendly piece; captures enemy piece and stops.
 */
function slide(
  board: Board,
  row: number,
  col: number,
  dr: number,
  dc: number,
  side: Owner
): Coord[] {
  const result: Coord[] = [];
  let r = row + dr;
  let c = col + dc;
  while (inBounds(r, c)) {
    const sq = board[r][c];
    if (sq !== null) {
      if (sq.owner !== side) {
        result.push({ row: r, col: c }); // capture
      }
      break; // blocked regardless
    }
    result.push({ row: r, col: c });
    r += dr;
    c += dc;
  }
  return result;
}

/**
 * Collect a set of fixed step offsets, filtering out-of-bounds and friendly
 * pieces.
 */
function steps(
  board: Board,
  row: number,
  col: number,
  offsets: readonly [number, number][],
  side: Owner
): Coord[] {
  const result: Coord[] = [];
  for (const [dr, dc] of offsets) {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) continue;
    const sq = board[r][c];
    if (sq !== null && sq.owner === side) continue; // friendly
    result.push({ row: r, col: c });
  }
  return result;
}

/**
 * Deltas from sente's perspective where "forward" = decreasing row index.
 * For gote, all row deltas are negated.
 */
function orientedOffsets(
  offsets: readonly [number, number][],
  side: Owner
): [number, number][] {
  const flip = side === "gote" ? -1 : 1;
  return offsets.map(([dr, dc]) => [dr * flip, dc]);
}

// Raw offsets from sente's POV (forward = row - 1)
const GOLD_OFFSETS_SENTE: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1], // forward row
  [0, -1],           [0, 1],  // sideways
              [1, 0],          // backward center
];

const SILVER_OFFSETS_SENTE: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1], // forward row
  [1, -1],           [1, 1],  // diagonal back
];

const KING_OFFSETS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

const BISHOP_DIRS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS: [number, number][]   = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const KING_ORTH_OFFSETS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const KING_DIAG_OFFSETS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export function legalDestinations(
  board: Board,
  from: Coord,
  side: Owner
): Coord[] {
  const { row, col } = from;
  const sq = board[row][col];

  // Square must contain a piece belonging to `side`
  if (sq === null || sq.owner !== side) return [];

  const { pieceType, promoted } = sq;

  // Promoted P / L / N / S all move like Gold
  const movesLikeGold =
    promoted && (pieceType === "P" || pieceType === "L" || pieceType === "N" || pieceType === "S");

  if (pieceType === "K") {
    return steps(board, row, col, KING_OFFSETS, side);
  }

  if (pieceType === "G" || movesLikeGold) {
    return steps(board, row, col, orientedOffsets(GOLD_OFFSETS_SENTE, side), side);
  }

  if (pieceType === "S" && !promoted) {
    return steps(board, row, col, orientedOffsets(SILVER_OFFSETS_SENTE, side), side);
  }

  if (pieceType === "N" && !promoted) {
    const dr = side === "sente" ? -2 : 2;
    return steps(board, row, col, [[dr, -1], [dr, 1]], side);
  }

  if (pieceType === "L" && !promoted) {
    // Slide forward only
    const dr = side === "sente" ? -1 : 1;
    return slide(board, row, col, dr, 0, side);
  }

  if (pieceType === "P" && !promoted) {
    const dr = side === "sente" ? -1 : 1;
    return steps(board, row, col, [[dr, 0]], side);
  }

  if (pieceType === "B") {
    const diagonals = BISHOP_DIRS.flatMap((dir) => slide(board, row, col, dir[0], dir[1], side));
    if (!promoted) return diagonals;
    // Promoted bishop (Horse): adds king's orthogonal moves
    const extra = steps(board, row, col, KING_ORTH_OFFSETS, side);
    return [...diagonals, ...extra];
  }

  if (pieceType === "R") {
    const orthos = ROOK_DIRS.flatMap((dir) => slide(board, row, col, dir[0], dir[1], side));
    if (!promoted) return orthos;
    // Promoted rook (Dragon): adds king's diagonal moves
    const extra = steps(board, row, col, KING_DIAG_OFFSETS, side);
    return [...orthos, ...extra];
  }

  return [];
}

// ---------------------------------------------------------------------------
// 4. Promotion helpers
// ---------------------------------------------------------------------------

// Pieces that can promote
const PROMOTABLE: ReadonlySet<PieceType> = new Set(["P", "L", "N", "S", "B", "R"]);

/** Promotion zone: rows 0-2 for sente, rows 6-8 for gote */
function inPromotionZone(row: number, side: Owner): boolean {
  return side === "sente" ? row <= 2 : row >= 6;
}

export function canPromote(
  piece: NonNullable<Square>,
  from: Coord,
  to: Coord,
  side: Owner
): boolean {
  if (piece.promoted) return false;
  if (!PROMOTABLE.has(piece.pieceType)) return false;
  return inPromotionZone(from.row, side) || inPromotionZone(to.row, side);
}

export function mustPromote(
  piece: NonNullable<Square>,
  to: Coord,
  side: Owner
): boolean {
  if (piece.promoted) return false;

  const { pieceType } = piece;
  const { row } = to;

  if (pieceType === "P" || pieceType === "L") {
    // Cannot exist on the last rank without promoting
    return side === "sente" ? row === 0 : row === 8;
  }

  if (pieceType === "N") {
    // Cannot exist on last 2 ranks without promoting
    return side === "sente" ? row <= 1 : row >= 7;
  }

  return false;
}
