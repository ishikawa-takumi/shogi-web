import { useMemo } from "react";
import type { PromptNode, ReviewCard, MoveResult } from "../types/index.ts";
import { parseSfen } from "../engine/sfen.ts";
import { buildHintLadder } from "../engine/hints.ts";
import { ShogiBoard } from "../components/board/ShogiBoard.tsx";
import { CoachPanel } from "../components/training/CoachPanel.tsx";
import { QAChat } from "../components/training/QAChat.tsx";
import { SessionProgress } from "../components/training/SessionProgress.tsx";
import { SessionSummary } from "../components/training/SessionSummary.tsx";
import { useMoveHandler } from "../hooks/useMoveHandler.ts";

type Props = {
  readonly prompt: PromptNode | null;
  readonly onSubmitMove: (usi: string) => MoveResult;
  readonly onSaveCard: (card: ReviewCard) => Promise<void>;
  readonly onAdvance: () => void;
  readonly onSessionEnd: () => void;
  readonly sessionQueue: readonly string[];
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
  const sfen = prompt?.sfen;
  const parsed = useMemo(() => (sfen ? parseSfen(sfen) : null), [sfen]);
  const orientation = prompt?.sideToMove === "gote" ? "gote" as const : "sente" as const;
  const hintLadder = useMemo(() => (prompt ? buildHintLadder(prompt) : null), [prompt]);

  const {
    selectedFrom,
    feedback,
    feedbackType,
    sessionCompleted,
    previousComment,
    legalTargets,
    handleCellClick,
    executeMove,
    clearPreviousComment,
  } = useMoveHandler({ prompt, parsed, onSubmitMove, onSaveCard, onAdvance });

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-3xl">&#127881;</p>
          <p className="mt-3 text-base font-semibold text-stone-800">お疲れさまでした</p>
          <p className="mt-1 text-sm text-stone-500">本日のセッション対象がありません。</p>
          <button
            onClick={onSessionEnd}
            className="mt-6 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-700"
          >
            ダッシュボードへ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-medium text-stone-600">
          {prompt.openingNameJa} - 第{prompt.moveIndex}手
        </h1>
        <button
          onClick={onSessionEnd}
          className="text-xs text-stone-500 hover:text-stone-600"
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
        <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          <span className="flex-1">
            <span className="font-medium">正解！</span> {previousComment}
          </span>
          <button
            onClick={clearPreviousComment}
            aria-label="閉じる"
            className="shrink-0 text-green-400 hover:text-green-600"
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
        onSubmitManualMove={executeMove}
        disabled={sessionCompleted}
      />

      {/* Q&A chat */}
      <QAChat prompt={prompt} />
    </div>
  );
}
