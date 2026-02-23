import { useState, useMemo, useCallback, useEffect } from "react";
import type { PromptNode, ReviewCard, Coord, MoveResult } from "../types/index.ts";
import { parseSfen } from "../engine/sfen.ts";
import { legalDestinations, canPromote, mustPromote, normalizeUsiMove } from "../engine/move-validation.ts";
import { buildHintLadder } from "../engine/hints.ts";
import { ShogiBoard } from "../components/board/ShogiBoard.tsx";
import { CoachPanel } from "../components/training/CoachPanel.tsx";
import { QAChat } from "../components/training/QAChat.tsx";
import { SessionProgress } from "../components/training/SessionProgress.tsx";
import { SessionSummary } from "../components/training/SessionSummary.tsx";
import { coordToUsi } from "../utils/coord.ts";

type Props = {
  readonly prompt: PromptNode | null;
  readonly onSubmitMove: (usi: string) => MoveResult;
  readonly onSaveCard: (card: ReviewCard) => Promise<void>;
  readonly onAdvance: () => PromptNode | null;
  readonly onSessionEnd: () => void;
  readonly sessionQueue: readonly string[];
  readonly currentIndex: number;
  readonly reviewedCount: number;
  readonly correctCount: number;
};

export function TrainingScreen({
  prompt,
  onSubmitMove,
  onSaveCard,
  onAdvance,
  onSessionEnd,
  sessionQueue,
  reviewedCount,
  correctCount,
}: Props) {
  const [selectedFrom, setSelectedFrom] = useState<Coord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "info" | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [previousComment, setPreviousComment] = useState<string | null>(null);

  const parsed = useMemo(() => (prompt ? parseSfen(prompt.sfen) : null), [prompt?.sfen]);
  const orientation = prompt?.sideToMove === "gote" ? "gote" as const : "sente" as const;

  const legalTargets = useMemo(() => {
    if (!parsed || !selectedFrom || !prompt) return [];
    return legalDestinations(parsed.board, selectedFrom, prompt.sideToMove);
  }, [parsed, selectedFrom, prompt]);

  const hintLadder = useMemo(() => (prompt ? buildHintLadder(prompt) : null), [prompt]);

  // Reset selection when prompt changes (previousComment intentionally preserved)
  useEffect(() => {
    setSelectedFrom(null);
    setFeedback(null);
    setFeedbackType(null);
  }, [prompt?.nodeId]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!prompt || !parsed || sessionCompleted) return;

      if (previousComment) setPreviousComment(null);

      const clicked: Coord = { row, col };
      const square = parsed.board[row]?.[col] ?? null;
      const isOwnPiece = square?.owner === prompt.sideToMove;

      // No piece selected yet
      if (!selectedFrom) {
        if (!isOwnPiece) {
          setFeedback("手番の駒を先に選択してください。");
          setFeedbackType("info");
          return;
        }
        const targets = legalDestinations(parsed.board, clicked, prompt.sideToMove);
        if (targets.length === 0) {
          setFeedback("その駒には合法手がありません。");
          setFeedbackType("error");
          return;
        }
        setSelectedFrom(clicked);
        setFeedback("移動先のマスを選択してください。");
        setFeedbackType("info");
        return;
      }

      // Clicking the same piece deselects
      if (selectedFrom.row === clicked.row && selectedFrom.col === clicked.col) {
        setSelectedFrom(null);
        setFeedback(null);
        setFeedbackType(null);
        return;
      }

      // Clicking another own piece switches selection
      if (isOwnPiece) {
        const targets = legalDestinations(parsed.board, clicked, prompt.sideToMove);
        if (targets.length > 0) {
          setSelectedFrom(clicked);
          return;
        }
      }

      // Check if the target is in legal moves
      const isLegal = legalTargets.some((t) => t.row === clicked.row && t.col === clicked.col);
      if (!isLegal) {
        setFeedback("その駒はそのマスへ移動できません。");
        setFeedbackType("error");
        return;
      }

      // Build USI move
      const source = parsed.board[selectedFrom.row]?.[selectedFrom.col];
      if (!source) return;

      const baseMove = `${coordToUsi(selectedFrom)}${coordToUsi(clicked)}`;
      const canProm = canPromote(source, selectedFrom, clicked, prompt.sideToMove);
      const mustProm = mustPromote(source, clicked, prompt.sideToMove);

      let promote = mustProm;
      if (!promote && canProm) {
        // Auto-promote if the expected answer includes promotion
        const expected = prompt.expectedMovesUsi.map((m) => normalizeUsiMove(m));
        const plusMove = normalizeUsiMove(`${baseMove}+`);
        const plainMove = normalizeUsiMove(baseMove);
        if (expected.includes(plusMove) && !expected.includes(plainMove)) {
          promote = true;
        }
      }

      const usiMove = promote ? `${baseMove}+` : baseMove;
      executeMove(usiMove);
    },
    [prompt, parsed, selectedFrom, legalTargets, sessionCompleted, previousComment],
  );

  function executeMove(usi: string) {
    if (!prompt) return;

    setPreviousComment(null);
    const result = onSubmitMove(usi);

    if (result.invalidInput) {
      setFeedback("USI形式が不正です。例: 7g7f / 2b3c+ / P*5d");
      setFeedbackType("error");
      setSelectedFrom(null);
      return;
    }

    // Save the updated card
    void onSaveCard(result.reviewCardUpdate);

    if (result.isCorrect) {
      setSelectedFrom(null);

      if (result.sessionCompleted) {
        setSessionCompleted(true);
        return;
      }

      // Store teaching comment, then immediately advance to next problem
      setPreviousComment(prompt.teachingComment);
      onAdvance();
    } else {
      setFeedback(`不正解です。正解は ${result.expectedUsi} です。もう一度解いてください。`);
      setFeedbackType("error");
      setSelectedFrom(null);
    }
  }

  function handleManualMove(usi: string) {
    executeMove(usi);
  }

  if (sessionCompleted) {
    return (
      <SessionSummary
        reviewed={reviewedCount}
        correct={correctCount}
        onBackToDashboard={onSessionEnd}
        onStartNewSession={onSessionEnd}
      />
    );
  }

  if (!prompt) {
    return (
      <div className="p-8 text-center text-stone-500">
        本日のセッション対象がありません。
        <button onClick={onSessionEnd} className="ml-2 underline">戻る</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-stone-500">
          {prompt.openingNameJa} - 第{prompt.moveIndex}手
        </div>
        <button
          onClick={onSessionEnd}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          終了
        </button>
      </div>

      {/* Progress */}
      <SessionProgress completed={reviewedCount} total={sessionQueue.length} correct={correctCount} />

      {/* Board */}
      <ShogiBoard
        parsed={parsed}
        orientation={orientation}
        selectedFrom={selectedFrom}
        legalTargets={legalTargets}
        onCellClick={handleCellClick}
        feedbackType={feedbackType === "success" || feedbackType === "error" ? feedbackType : null}
      />

      {/* Previous answer explanation */}
      {previousComment && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span className="flex-1">
            <span className="font-medium">正解！</span> {previousComment}
          </span>
          <button
            onClick={() => setPreviousComment(null)}
            className="shrink-0 text-amber-400 hover:text-amber-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Coach panel */}
      <CoachPanel
        hintLadder={hintLadder}
        feedback={feedback}
        feedbackType={feedbackType}
        onSubmitManualMove={handleManualMove}
        disabled={sessionCompleted}
      />

      {/* Q&A chat */}
      <QAChat prompt={prompt} />
    </div>
  );
}
