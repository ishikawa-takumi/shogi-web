import { useState, useMemo, useCallback, useRef } from "react";
import type { PromptNode, ReviewCard, Coord, MoveResult, ParsedSfen } from "../types/index.ts";
import { legalDestinations, canPromote, mustPromote, normalizeUsiMove } from "../engine/move-validation.ts";
import { coordToUsi } from "../utils/coord.ts";

type MoveHandlerInput = {
  readonly prompt: PromptNode | null;
  readonly parsed: ParsedSfen | null;
  readonly onSubmitMove: (usi: string) => MoveResult;
  readonly onSaveCard: (card: ReviewCard) => Promise<void>;
  readonly onAdvance: () => void;
};

export function useMoveHandler({ prompt, parsed, onSubmitMove, onSaveCard, onAdvance }: MoveHandlerInput) {
  const [selectedFrom, setSelectedFrom] = useState<Coord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "info" | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [previousComment, setPreviousComment] = useState<string | null>(null);

  // Reset selection when prompt changes (previousComment intentionally preserved)
  const prevNodeIdRef = useRef(prompt?.nodeId);
  if (prompt?.nodeId !== prevNodeIdRef.current) {
    prevNodeIdRef.current = prompt?.nodeId;
    if (selectedFrom !== null) setSelectedFrom(null);
    if (feedback !== null) setFeedback(null);
    if (feedbackType !== null) setFeedbackType(null);
  }

  const legalTargets = useMemo(() => {
    if (!parsed || !selectedFrom || !prompt) return [];
    return legalDestinations(parsed.board, selectedFrom, prompt.sideToMove);
  }, [parsed, selectedFrom, prompt]);

  const executeMove = useCallback(
    (usi: string) => {
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
    },
    [prompt, onSubmitMove, onSaveCard, onAdvance],
  );

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
    [prompt, parsed, selectedFrom, legalTargets, sessionCompleted, previousComment, executeMove],
  );

  return {
    selectedFrom,
    feedback,
    feedbackType,
    sessionCompleted,
    previousComment,
    legalTargets,
    handleCellClick,
    executeMove,
    clearPreviousComment: useCallback(() => setPreviousComment(null), []),
  };
}
