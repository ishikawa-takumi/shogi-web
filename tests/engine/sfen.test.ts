import { describe, it, expect } from "vitest";
import { parseSfen } from "../../src/engine/sfen.ts";

describe("parseSfen", () => {
  it("parses initial position", () => {
    const sfen = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";
    const result = parseSfen(sfen);

    expect(result.board.length).toBe(9);
    expect(result.board[0].length).toBe(9);
    expect(result.sideToMove).toBe("sente");

    // Gote's lance at (0, 0)
    const goteLance = result.board[0][0];
    expect(goteLance).not.toBeNull();
    expect(goteLance!.owner).toBe("gote");
    expect(goteLance!.pieceType).toBe("L");
    expect(goteLance!.promoted).toBe(false);

    // Sente's king at (8, 4)
    const senteKing = result.board[8][4];
    expect(senteKing).not.toBeNull();
    expect(senteKing!.owner).toBe("sente");
    expect(senteKing!.pieceType).toBe("K");

    // Empty square at (3, 0)
    expect(result.board[3][0]).toBeNull();
  });

  it("parses gote side to move", () => {
    const sfen = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 2";
    const result = parseSfen(sfen);
    expect(result.sideToMove).toBe("gote");
  });

  it("parses promoted pieces", () => {
    const sfen = "4k4/9/4+P4/9/9/9/9/9/4K4 b - 1";
    const result = parseSfen(sfen);
    const promotedPawn = result.board[2][4];
    expect(promotedPawn).not.toBeNull();
    expect(promotedPawn!.pieceType).toBe("P");
    expect(promotedPawn!.promoted).toBe(true);
    expect(promotedPawn!.piece).toBe("と");
  });

  it("parses hand pieces", () => {
    const sfen = "4k4/9/9/9/9/9/9/9/4K4 b 2P1G3p - 1";
    const result = parseSfen(sfen);
    expect(result.hands.sente.P).toBe(2);
    expect(result.hands.sente.G).toBe(1);
    expect(result.hands.gote.P).toBe(3);
  });

  it("handles empty hand", () => {
    const sfen = "4k4/9/9/9/9/9/9/9/4K4 b - 1";
    const result = parseSfen(sfen);
    expect(result.hands.sente.P).toBe(0);
    expect(result.hands.gote.P).toBe(0);
  });

  it("handles sparse board", () => {
    const sfen = "4k4/9/4R4/9/9/9/9/9/4K4 b - 1";
    const result = parseSfen(sfen);
    const rook = result.board[2][4];
    expect(rook).not.toBeNull();
    expect(rook!.owner).toBe("sente");
    expect(rook!.pieceType).toBe("R");
  });
});
