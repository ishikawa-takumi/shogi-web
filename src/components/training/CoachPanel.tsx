import { useState, type FormEvent } from "react";
import type { HintLadder, HintLevel } from "../../types/index.ts";
import { resolveHintText, hintButtonLabel } from "../../engine/hints.ts";

type Props = {
  readonly hintLadder: HintLadder | null;
  readonly feedback: string | null;
  readonly feedbackType: "success" | "error" | "info" | null;
  readonly onSubmitManualMove: (usi: string) => void;
  readonly disabled: boolean;
};

export function CoachPanel({ hintLadder, feedback, feedbackType, onSubmitManualMove, disabled }: Props) {
  const [hintLevel, setHintLevel] = useState<HintLevel>(0);
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const hintText = resolveHintText(hintLadder, hintLevel);

  function cycleHint() {
    setHintLevel((prev) => {
      if (prev >= 3) return 0;
      return (prev + 1) as HintLevel;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const move = manualInput.trim();
    if (!move) return;
    onSubmitManualMove(move);
    setManualInput("");
  }

  return (
    <div className="space-y-3">
      {/* Feedback banner */}
      {feedback && (
        <div
          role="alert"
          aria-live="assertive"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            feedbackType === "success"
              ? "bg-green-100 text-green-800"
              : feedbackType === "error"
                ? "bg-red-100 text-red-800"
                : "bg-stone-100 text-stone-700"
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Hints */}
      {hintLadder && (
        <div className="space-y-2">
          {hintText && (
            <div className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">
              {hintText}
            </div>
          )}
          <button
            type="button"
            onClick={cycleHint}
            className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
          >
            {hintButtonLabel(hintLevel)}
          </button>
        </div>
      )}

      {/* Manual USI input (collapsed by default) */}
      {showManualInput ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="USI入力 (例: 7g7f)"
            disabled={disabled}
            className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !manualInput.trim()}
            className="rounded-md bg-stone-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-600 disabled:opacity-50"
          >
            送信
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowManualInput(true)}
          className="text-xs text-stone-500 hover:text-stone-700"
        >
          USI手動入力...
        </button>
      )}
    </div>
  );
}
