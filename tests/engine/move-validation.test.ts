import { describe, it, expect } from "vitest";
import {
  isValidUsiMove,
  normalizeUsiMove,
  legalDestinations,
  canPromote,
  mustPromote,
} from "../../src/engine/move-validation.ts";
import { parseSfen } from "../../src/engine/sfen.ts";
import type { Coord } from "../../src/types/index.ts";

describe("normalizeUsiMove", () => {
  it("normalizes case and trims whitespace", () => {
    expect(normalizeUsiMove(" P*5D ")).toBe("p*5d");
  });
});

describe("isValidUsiMove", () => {
  it("accepts valid normal moves", () => {
    expect(isValidUsiMove("7g7f")).toBe(true);
    expect(isValidUsiMove("2b3c+")).toBe(true);
  });

  it("accepts valid drop moves", () => {
    expect(isValidUsiMove("P*5d")).toBe(true);
  });

  it("rejects invalid moves", () => {
    expect(isValidUsiMove("7g7")).toBe(false);
    expect(isValidUsiMove("0g7f")).toBe(false);
    expect(isValidUsiMove("z*5d")).toBe(false);
    expect(isValidUsiMove("hello")).toBe(false);
  });
});

describe("legalDestinations", () => {
  it("returns pawn forward move for sente", () => {
    const sfen = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";
    const { board } = parseSfen(sfen);
    const from: Coord = { row: 6, col: 6 }; // Sente pawn at 3g
    const targets = legalDestinations(board, from, "sente");
    expect(targets.length).toBe(1);
    expect(targets[0]).toEqual({ row: 5, col: 6 });
  });

  it("returns empty for opponent piece", () => {
    const sfen = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";
    const { board } = parseSfen(sfen);
    const from: Coord = { row: 0, col: 0 }; // Gote lance
    const targets = legalDestinations(board, from, "sente");
    expect(targets.length).toBe(0);
  });

  it("returns king moves", () => {
    const sfen = "4k4/9/9/9/9/9/9/9/4K4 b - 1";
    const { board } = parseSfen(sfen);
    const from: Coord = { row: 8, col: 4 }; // Sente king at 5i
    const targets = legalDestinations(board, from, "sente");
    expect(targets.length).toBe(5); // 3 forward + 2 sideways
  });

  it("returns rook slide moves", () => {
    const sfen = "4k4/9/4R4/9/9/9/9/9/4K4 b - 1";
    const { board } = parseSfen(sfen);
    const from: Coord = { row: 2, col: 4 }; // Rook at 5c
    const targets = legalDestinations(board, from, "sente");
    // up: 2 squares, down: 6 squares, left: 4 squares, right: 4 squares, + gote king capture
    expect(targets.length).toBeGreaterThan(10);
  });
});

describe("canPromote", () => {
  it("returns true when entering promotion zone", () => {
    const piece = { owner: "sente" as const, pieceType: "P" as const, promoted: false, piece: "歩" };
    const from: Coord = { row: 3, col: 0 };
    const to: Coord = { row: 2, col: 0 };
    expect(canPromote(piece, from, to, "sente")).toBe(true);
  });

  it("returns false for already promoted piece", () => {
    const piece = { owner: "sente" as const, pieceType: "P" as const, promoted: true, piece: "と" };
    const from: Coord = { row: 3, col: 0 };
    const to: Coord = { row: 2, col: 0 };
    expect(canPromote(piece, from, to, "sente")).toBe(false);
  });

  it("returns false for gold", () => {
    const piece = { owner: "sente" as const, pieceType: "G" as const, promoted: false, piece: "金" };
    const from: Coord = { row: 3, col: 0 };
    const to: Coord = { row: 2, col: 0 };
    expect(canPromote(piece, from, to, "sente")).toBe(false);
  });
});

describe("mustPromote", () => {
  it("returns true for pawn on last rank", () => {
    const piece = { owner: "sente" as const, pieceType: "P" as const, promoted: false, piece: "歩" };
    const to: Coord = { row: 0, col: 0 };
    expect(mustPromote(piece, to, "sente")).toBe(true);
  });

  it("returns true for knight on second-to-last rank for sente", () => {
    const piece = { owner: "sente" as const, pieceType: "N" as const, promoted: false, piece: "桂" };
    const to: Coord = { row: 1, col: 0 };
    expect(mustPromote(piece, to, "sente")).toBe(true);
  });

  it("returns false for silver on last rank", () => {
    const piece = { owner: "sente" as const, pieceType: "S" as const, promoted: false, piece: "銀" };
    const to: Coord = { row: 0, col: 0 };
    expect(mustPromote(piece, to, "sente")).toBe(false);
  });
});

// ─── Gote piece tests ──────────────────────────────────────────────────────

describe("legalDestinations (gote perspective)", () => {
  it("returns gote pawn forward move (row increases)", () => {
    const sfen = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    const { board } = parseSfen(sfen);
    const from: Coord = { row: 2, col: 6 }; // gote pawn at 3c
    const targets = legalDestinations(board, from, "gote");
    expect(targets.length).toBe(1);
    expect(targets[0]).toEqual({ row: 3, col: 6 });
  });

  it("returns gote knight moves (row + 2)", () => {
    const sfen = "4k4/9/9/4n4/9/9/9/9/4K4 w - 1";
    const { board } = parseSfen(sfen);
    const from: Coord = { row: 3, col: 4 }; // gote knight at 5d
    const targets = legalDestinations(board, from, "gote");
    expect(targets.length).toBe(2);
    const rows = targets.map((t) => t.row);
    expect(rows.every((r) => r === 5)).toBe(true);
  });

  it("returns gote lance forward slides (row increases)", () => {
    const sfen = "4k4/4l4/9/9/9/9/9/9/4K4 w - 1";
    const { board } = parseSfen(sfen);
    const from: Coord = { row: 1, col: 4 }; // gote lance at 5b
    const targets = legalDestinations(board, from, "gote");
    // Should slide from row 2 to row 8 (but row 8 has sente king = capture)
    expect(targets.length).toBe(7);
  });
});

describe("legalDestinations (bishop)", () => {
  it("returns bishop diagonal slides", () => {
    const sfen = "4k4/9/9/9/4B4/9/9/9/4K4 b - 1";
    const { board } = parseSfen(sfen);
    const from: Coord = { row: 4, col: 4 }; // bishop at 5e
    const targets = legalDestinations(board, from, "sente");
    // 4 diagonals, each with 4 squares
    expect(targets.length).toBe(16);
  });

  it("returns promoted bishop (horse) with orthogonal king steps", () => {
    const sfen = "4k4/9/9/9/4+B4/9/9/9/4K4 b - 1";
    const { board } = parseSfen(sfen);
    const from: Coord = { row: 4, col: 4 }; // promoted bishop at 5e center
    const targets = legalDestinations(board, from, "sente");
    // 16 diagonal + 4 orthogonal (up, down, left, right)
    expect(targets.length).toBe(20);
  });
});

describe("canPromote (gote perspective)", () => {
  it("returns true when gote enters promotion zone (row >= 6)", () => {
    const piece = { owner: "gote" as const, pieceType: "P" as const, promoted: false, piece: "歩" };
    const from: Coord = { row: 5, col: 0 };
    const to: Coord = { row: 6, col: 0 };
    expect(canPromote(piece, from, to, "gote")).toBe(true);
  });

  it("returns true when gote moves from promotion zone", () => {
    const piece = { owner: "gote" as const, pieceType: "S" as const, promoted: false, piece: "銀" };
    const from: Coord = { row: 7, col: 0 };
    const to: Coord = { row: 5, col: 1 };
    expect(canPromote(piece, from, to, "gote")).toBe(true);
  });
});

describe("mustPromote (gote perspective)", () => {
  it("returns true for gote pawn on last rank (row 8)", () => {
    const piece = { owner: "gote" as const, pieceType: "P" as const, promoted: false, piece: "歩" };
    const to: Coord = { row: 8, col: 0 };
    expect(mustPromote(piece, to, "gote")).toBe(true);
  });

  it("returns true for gote knight on second-to-last rank (row 7)", () => {
    const piece = { owner: "gote" as const, pieceType: "N" as const, promoted: false, piece: "桂" };
    const to: Coord = { row: 7, col: 0 };
    expect(mustPromote(piece, to, "gote")).toBe(true);
  });

  it("returns true for gote lance on last rank (row 8)", () => {
    const piece = { owner: "gote" as const, pieceType: "L" as const, promoted: false, piece: "香" };
    const to: Coord = { row: 8, col: 0 };
    expect(mustPromote(piece, to, "gote")).toBe(true);
  });
});
