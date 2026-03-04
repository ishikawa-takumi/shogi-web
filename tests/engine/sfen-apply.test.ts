import { describe, it, expect } from "vitest";
import { applyUsiMove } from "../../src/engine/sfen-apply.ts";
import { parseSfen } from "../../src/engine/sfen.ts";

const INITIAL = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

describe("applyUsiMove", () => {
  it("applies a simple pawn push (2g2f)", () => {
    const result = applyUsiMove(INITIAL, "2g2f");
    const parsed = parseSfen(result);

    // Pawn should be at row=5 col=7 (2f = file2, rank f=5)
    const pawn = parsed.board[5][7];
    expect(pawn).not.toBeNull();
    expect(pawn!.owner).toBe("sente");
    expect(pawn!.pieceType).toBe("P");

    // Original square should be empty
    const oldSquare = parsed.board[6][7];
    expect(oldSquare).toBeNull();

    // Side switches to gote
    expect(parsed.sideToMove).toBe("gote");
  });

  it("applies a bishop diagonal move (8h2b+) with promotion and capture", () => {
    // Set up a position where sente's bishop can take gote's bishop
    // After 7g7f 3c3d: bishop path is open
    const afterP1 = applyUsiMove(INITIAL, "7g7f");
    const afterP2 = applyUsiMove(afterP1, "3c3d");

    // Now 8h2b+ captures gote's bishop with promotion
    const result = applyUsiMove(afterP2, "8h2b+");
    const parsed = parseSfen(result);

    // Promoted bishop at 2b (row=1, col=7)
    const horse = parsed.board[1][7];
    expect(horse).not.toBeNull();
    expect(horse!.owner).toBe("sente");
    expect(horse!.pieceType).toBe("B");
    expect(horse!.promoted).toBe(true);

    // Sente should have captured gote's bishop → B in hand
    expect(parsed.hands.sente.B).toBe(1);

    // Original square empty
    expect(parsed.board[7][1]).toBeNull();
  });

  it("applies a drop move (B*5e)", () => {
    // Create a position with a bishop in sente's hand
    const sfen = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/7R1/LNSGKGSNL b B 1";
    const result = applyUsiMove(sfen, "B*5e");
    const parsed = parseSfen(result);

    // Bishop at 5e (row=4, col=4)
    const bishop = parsed.board[4][4];
    expect(bishop).not.toBeNull();
    expect(bishop!.owner).toBe("sente");
    expect(bishop!.pieceType).toBe("B");
    expect(bishop!.promoted).toBe(false);

    // Hand should be empty now
    expect(parsed.hands.sente.B).toBe(0);
  });

  it("correctly increments move number (ply count)", () => {
    // Sente moves: ply 1 → 2
    const after1 = applyUsiMove(INITIAL, "7g7f");
    expect(after1).toContain(" w - 2");

    // Gote moves: ply 2 → 3
    const after2 = applyUsiMove(after1, "3c3d");
    expect(after2).toContain(" b - 3");
  });

  it("handles chain of moves (aigakari opening)", () => {
    // Replay the aigakari basic line: 2g2f → 8c8d → 2f2e → 8d8e
    const m1 = applyUsiMove(INITIAL, "2g2f");  // sente
    const m2 = applyUsiMove(m1, "8c8d");         // gote
    const m3 = applyUsiMove(m2, "2f2e");          // sente
    const m4 = applyUsiMove(m3, "8d8e");          // gote

    const parsed = parseSfen(m4);

    // Sente pawn at 2e (row=4, col=7)
    const sentePawn = parsed.board[4][7];
    expect(sentePawn).not.toBeNull();
    expect(sentePawn!.owner).toBe("sente");

    // Gote pawn at 8e (row=4, col=1)
    const gotePawn = parsed.board[4][1];
    expect(gotePawn).not.toBeNull();
    expect(gotePawn!.owner).toBe("gote");
  });

  it("handles capture adding piece to hand", () => {
    // Simple position: sente rook captures gote pawn
    const sfen = "4k4/9/4p4/9/4R4/9/9/9/4K4 b - 1";
    const result = applyUsiMove(sfen, "5e5c");
    const parsed = parseSfen(result);

    // Rook at 5c
    const rook = parsed.board[2][4];
    expect(rook).not.toBeNull();
    expect(rook!.owner).toBe("sente");
    expect(rook!.pieceType).toBe("R");

    // Pawn added to sente's hand
    expect(parsed.hands.sente.P).toBe(1);
  });

  it("throws when dropping a piece not in hand", () => {
    expect(() => applyUsiMove(INITIAL, "B*5e")).toThrow();
  });

  it("round-trips: serialize then parse produces consistent state", () => {
    const m1 = applyUsiMove(INITIAL, "7g7f");
    const m2 = applyUsiMove(m1, "8c8d");
    const parsed = parseSfen(m2);

    // Board should be valid 9x9
    expect(parsed.board.length).toBe(9);
    for (const row of parsed.board) {
      expect(row.length).toBe(9);
    }
  });
});
