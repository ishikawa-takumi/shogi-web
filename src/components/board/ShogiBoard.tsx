import { useMemo, useCallback, type MouseEvent } from "react";
import type { Square, Coord, Owner, ParsedSfen } from "../../types/index.ts";

// ─── Layout constants ──────────────────────────────────────────────────────
const CELL = 48;
const BOARD_SIZE = 9 * CELL;
const PAD = 32;
const HAND_W = 56;
const SVG_W = HAND_W + PAD + BOARD_SIZE + PAD + HAND_W;
const SVG_H = PAD + BOARD_SIZE + PAD;

// ─── Types ─────────────────────────────────────────────────────────────────
type BoardOrientation = "sente" | "gote";

type Props = {
  readonly parsed: ParsedSfen | null;
  readonly orientation: BoardOrientation;
  readonly selectedFrom: Coord | null;
  readonly legalTargets: readonly Coord[];
  readonly onCellClick: (row: number, col: number) => void;
  readonly highlightCorrectPath?: Coord[] | null;
  readonly feedbackType?: "success" | "error" | null;
};

// ─── Coordinate helpers ────────────────────────────────────────────────────
function displayCoord(row: number, col: number, orientation: BoardOrientation): { dr: number; dc: number } {
  if (orientation === "gote") {
    return { dr: 8 - row, dc: 8 - col };
  }
  return { dr: row, dc: col };
}

function actualCoord(displayRow: number, displayCol: number, orientation: BoardOrientation): Coord {
  if (orientation === "gote") {
    return { row: 8 - displayRow, col: 8 - displayCol };
  }
  return { row: displayRow, col: displayCol };
}

// ─── Piece rendering ───────────────────────────────────────────────────────
const KANJI: Record<string, string> = {
  P: "歩", L: "香", N: "桂", S: "銀", G: "金", B: "角", R: "飛", K: "玉",
};
const PROMOTED_KANJI: Record<string, string> = {
  P: "と", L: "杏", N: "圭", S: "全", B: "馬", R: "龍",
};

function pieceKanji(sq: NonNullable<Square>): string {
  if (sq.promoted) {
    return PROMOTED_KANJI[sq.pieceType] ?? sq.pieceType;
  }
  return KANJI[sq.pieceType] ?? sq.pieceType;
}

// ─── Pentagon path for piece shape ─────────────────────────────────────────
function pentagonPath(cx: number, cy: number, size: number, isGote: boolean): string {
  const s = size * 0.42;
  const topY = cy - s * 1.1;
  const midY = cy - s * 0.3;
  const botY = cy + s * 1.0;
  const halfW = s * 0.85;
  const topHalfW = s * 0.15;

  const points = [
    [cx, topY],
    [cx + halfW, midY],
    [cx + halfW, botY],
    [cx - halfW, botY],
    [cx - halfW, midY],
  ];

  if (isGote) {
    // Rotate 180° around center
    const rotated = points.map(([px, py]) => [2 * cx - px, 2 * cy - py]);
    return rotated.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("") + "Z";
  }

  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("") + "Z";
}

// ─── Hand pieces (komadai) ─────────────────────────────────────────────────
const HAND_ORDER: readonly string[] = ["R", "B", "G", "S", "N", "L", "P"];

function HandPieces({ hands, side, x, orientation }: {
  hands: ParsedSfen["hands"];
  side: Owner;
  x: number;
  orientation: BoardOrientation;
}) {
  const pieces = hands[side];
  const isBottom = (side === "sente" && orientation === "sente") || (side === "gote" && orientation === "gote");
  let yOffset = isBottom ? SVG_H - PAD - 10 : PAD + 10;
  const dy = isBottom ? -36 : 36;

  const elements: JSX.Element[] = [];
  for (const pt of HAND_ORDER) {
    const count = pieces[pt as keyof typeof pieces] ?? 0;
    if (count === 0) continue;
    elements.push(
      <g key={`hand-${side}-${pt}`}>
        <text
          x={x}
          y={yOffset}
          textAnchor="middle"
          dominantBaseline="central"
          className={`piece-text ${side === "gote" ? "gote-piece" : "sente-piece"}`}
          fontSize="18"
        >
          {KANJI[pt] ?? pt}
        </text>
        {count > 1 && (
          <text
            x={x + 16}
            y={yOffset + 10}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            className="hand-count"
          >
            {count}
          </text>
        )}
      </g>,
    );
    yOffset += dy;
  }

  return <>{elements}</>;
}

// ─── Main component ────────────────────────────────────────────────────────
export function ShogiBoard({
  parsed,
  orientation,
  selectedFrom,
  legalTargets,
  onCellClick,
  highlightCorrectPath,
  feedbackType,
}: Props) {
  const legalSet = useMemo(
    () => new Set(legalTargets.map((c) => `${c.row},${c.col}`)),
    [legalTargets],
  );

  const correctSet = useMemo(
    () => new Set((highlightCorrectPath ?? []).map((c) => `${c.row},${c.col}`)),
    [highlightCorrectPath],
  );

  const handleClick = useCallback(
    (e: MouseEvent<SVGRectElement>) => {
      const dr = parseInt(e.currentTarget.dataset.row!, 10);
      const dc = parseInt(e.currentTarget.dataset.col!, 10);
      const actual = actualCoord(dr, dc, orientation);
      onCellClick(actual.row, actual.col);
    },
    [onCellClick, orientation],
  );

  const boardX = HAND_W + PAD;
  const boardY = PAD;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className={`shogi-board-svg ${feedbackType === "success" ? "board-correct" : ""} ${feedbackType === "error" ? "board-incorrect" : ""}`}
      style={{ maxWidth: "100%", height: "auto" }}
    >
      {/* Background */}
      <rect x={boardX} y={boardY} width={BOARD_SIZE} height={BOARD_SIZE} className="board-bg" rx="2" />

      {/* Grid lines */}
      {Array.from({ length: 10 }, (_, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={boardX + i * CELL} y1={boardY}
            x2={boardX + i * CELL} y2={boardY + BOARD_SIZE}
            className="grid-line"
          />
          <line
            x1={boardX} y1={boardY + i * CELL}
            x2={boardX + BOARD_SIZE} y2={boardY + i * CELL}
            className="grid-line"
          />
        </g>
      ))}

      {/* File labels (top) */}
      {Array.from({ length: 9 }, (_, dc) => {
        const actual = actualCoord(0, dc, orientation);
        const fileNum = 9 - actual.col;
        return (
          <text
            key={`file-${dc}`}
            x={boardX + dc * CELL + CELL / 2}
            y={boardY - 10}
            textAnchor="middle"
            className="coord-label"
            fontSize="12"
          >
            {fileNum}
          </text>
        );
      })}

      {/* Rank labels (right) */}
      {Array.from({ length: 9 }, (_, dr) => {
        const actual = actualCoord(dr, 0, orientation);
        const rankChar = String.fromCharCode(97 + actual.row);
        return (
          <text
            key={`rank-${dr}`}
            x={boardX + BOARD_SIZE + 14}
            y={boardY + dr * CELL + CELL / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="coord-label"
            fontSize="12"
          >
            {rankChar}
          </text>
        );
      })}

      {/* Star points */}
      {[[2, 6], [6, 6], [2, 2], [6, 2]].map(([r, c]) => {
        const { dr, dc } = displayCoord(r, c, orientation);
        return (
          <circle
            key={`star-${r}-${c}`}
            cx={boardX + dc * CELL + CELL}
            cy={boardY + dr * CELL + CELL}
            r={3}
            className="star-point"
          />
        );
      })}

      {/* Cells: highlights + pieces */}
      {parsed && Array.from({ length: 9 }, (_, dr) =>
        Array.from({ length: 9 }, (_, dc) => {
          const actual = actualCoord(dr, dc, orientation);
          const sq = parsed.board[actual.row]?.[actual.col] ?? null;
          const x = boardX + dc * CELL;
          const y = boardY + dr * CELL;
          const cx = x + CELL / 2;
          const cy = y + CELL / 2;
          const key = `${actual.row},${actual.col}`;
          const isSelected = selectedFrom?.row === actual.row && selectedFrom?.col === actual.col;
          const isLegal = legalSet.has(key);
          const isCorrectPath = correctSet.has(key);

          return (
            <g key={`cell-${dr}-${dc}`}>
              {/* Highlight overlays */}
              {isSelected && (
                <rect x={x} y={y} width={CELL} height={CELL} className="cell-selected" />
              )}
              {isCorrectPath && (
                <rect x={x} y={y} width={CELL} height={CELL} className="cell-correct-path" />
              )}

              {/* Piece (rendered before click target so it doesn't steal events) */}
              {sq && (
                <g className={`piece ${sq.owner === "gote" ? "gote-piece" : "sente-piece"}`} style={{ pointerEvents: "none" }}>
                  <path
                    d={pentagonPath(cx, cy, CELL, sq.owner === "gote")}
                    className="piece-shape"
                  />
                  <text
                    x={cx}
                    y={cy + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`piece-kanji ${sq.promoted ? "promoted" : ""}`}
                    fontSize="22"
                  >
                    {pieceKanji(sq)}
                  </text>
                </g>
              )}

              {/* Legal move dot */}
              {isLegal && !sq && (
                <circle cx={cx} cy={cy} r={7} className="legal-dot" style={{ pointerEvents: "none" }} />
              )}
              {isLegal && sq && (
                <circle cx={cx} cy={cy} r={CELL / 2 - 2} className="legal-capture" style={{ pointerEvents: "none" }} />
              )}

              {/* Clickable area — LAST so it's on top of everything and receives all clicks */}
              <rect
                x={x} y={y} width={CELL} height={CELL}
                fill="transparent"
                data-row={dr}
                data-col={dc}
                onClick={handleClick}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        }),
      )}

      {/* Hand pieces */}
      {parsed && (
        <>
          <HandPieces hands={parsed.hands} side="gote" x={HAND_W / 2} orientation={orientation} />
          <HandPieces hands={parsed.hands} side="sente" x={SVG_W - HAND_W / 2} orientation={orientation} />
        </>
      )}
    </svg>
  );
}
