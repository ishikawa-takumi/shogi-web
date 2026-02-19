import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { PromptNode, ReviewCard, Coord, MoveResult } from "../types/index.ts";
import { parseSfen } from "../engine/sfen.ts";
import { legalDestinations, canPromote, mustPromote, normalizeUsiMove } from "../engine/move-validation.ts";
import { buildHintLadder } from "../engine/hints.ts";
import { ShogiBoard } from "../components/board/ShogiBoard.tsx";
import { CoachPanel } from "../components/training/CoachPanel.tsx";
import { SessionProgress } from "../components/training/SessionProgress.tsx";
import { SessionSummary } from "../components/training/SessionSummary.tsx";
import { coordToUsi } from "../utils/coord.ts";

const AUTO_ADVANCE_DELAY_MS = 800;

type Props = {
  readonly prompt: PromptNode | null;
  readonly onSubmitMove: (usi: string) => MoveResult;
  readonly onSaveCard: (card: ReviewCard) => Promise<void>;
  readonly onAdvance: () => PromptNode | null;
  readonly onSessionEnd: () => void;
  readonly getReviewCard: (nodeId: string) => ReviewCard | undefined;
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
  getReviewCard,
  sessionQueue,
  currentIndex,
  reviewedCount,
  correctCount,
}: Props) {
  const [selectedFrom, setSelectedFrom] = useState<Coord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "info" | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [awaitingAdvance, setAwaitingAdvance] = useState(false);
  const advanceTimerRef = useRef<number | null>(null);

  const parsed = useMemo(() => (prompt ? parseSfen(prompt.sfen) : null), [prompt?.sfen]);
  const orientation = prompt?.sideToMove === "gote" ? "gote" as const : "sente" as const;

  const legalTargets = useMemo(() => {
    if (!parsed || !selectedFrom || !prompt) return [];
    return legalDestinations(parsed.board, selectedFrom, prompt.sideToMove);
  }, [parsed, selectedFrom, prompt]);

  const hintLadder = useMemo(() => (prompt ? buildHintLadder(prompt) : null), [prompt]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  // Reset selection when prompt changes
  useEffect(() => {
    setSelectedFrom(null);
    setFeedback(null);
    setFeedbackType(null);
    setAwaitingAdvance(false);
  }, [prompt?.nodeId]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!prompt || !parsed || sessionCompleted) return;

      if (awaitingAdvance) {
        setFeedback("結果を表示中です。少し待つと自動で次の問題へ進みます。");
        setFeedbackType("info");
        return;
      }

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
    [prompt, parsed, selectedFrom, legalTargets, sessionCompleted, awaitingAdvance],
  );

  function executeMove(usi: string) {
    if (!prompt) return;

    const existingCard = getReviewCard(prompt.nodeId);
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
      setFeedback("正解です。次へ進みます。");
      setFeedbackType("success");
      setSelectedFrom(null);

      if (result.sessionCompleted) {
        setSessionCompleted(true);
        return;
      }

      // Auto-advance after delay
      setAwaitingAdvance(true);
      advanceTimerRef.current = window.setTimeout(() => {
        advanceToNext();
      }, AUTO_ADVANCE_DELAY_MS);
    } else {
      setFeedback(`不正解です。正解は ${result.expectedUsi} です。もう一度解いてください。`);
      setFeedbackType("error");
      setSelectedFrom(null);
    }
  }

  function advanceToNext() {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setAwaitingAdvance(false);
    onAdvance();
  }

  function handleManualMove(usi: string) {
    if (awaitingAdvance) {
      setFeedback("結果を表示中です。少し待つと自動で次の問題へ進みます。");
      setFeedbackType("info");
      return;
    }
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

      {/* Coach panel */}
      <CoachPanel
        hintLadder={hintLadder}
        feedback={feedback}
        feedbackType={feedbackType}
        onSubmitManualMove={handleManualMove}
        disabled={sessionCompleted || awaitingAdvance}
      />

      {/* Skip button during auto-advance */}
      {awaitingAdvance && (
        <button
          onClick={advanceToNext}
          className="w-full rounded-lg border border-stone-200 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
        >
          次へ進む
        </button>
      )}
    </div>
  );
}
