import type { Coord } from "../types/index.ts";

export function usiSquareToCoord(square: string): Coord | null {
  if (!/^[1-9][a-i]$/.test(square)) {
    return null;
  }
  const file = Number(square[0]);
  const row = square.charCodeAt(1) - 97;
  const col = 9 - file;
  return { row, col };
}

export function coordToUsi(coord: Coord): string {
  const file = 9 - coord.col;
  const rank = String.fromCharCode(97 + coord.row);
  return `${file}${rank}`;
}

export function coordKey(coord: Coord): string {
  return `${coord.row},${coord.col}`;
}

export function displayToActualCoord(
  displayRow: number,
  displayCol: number,
  orientation: "sente" | "gote",
): Coord {
  if (orientation === "gote") {
    return { row: 8 - displayRow, col: 8 - displayCol };
  }
  return { row: displayRow, col: displayCol };
}

export function actualToDisplayCoord(
  coord: Coord,
  orientation: "sente" | "gote",
): { displayRow: number; displayCol: number } {
  if (orientation === "gote") {
    return { displayRow: 8 - coord.row, displayCol: 8 - coord.col };
  }
  return { displayRow: coord.row, displayCol: coord.col };
}
