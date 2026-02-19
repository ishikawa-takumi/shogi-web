type Props = {
  readonly reviewed: number;
  readonly correct: number;
  readonly onBackToDashboard: () => void;
  readonly onStartNewSession: () => void;
};

export function SessionSummary({ reviewed, correct, onBackToDashboard, onStartNewSession }: Props) {
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <h2 className="text-xl font-bold text-stone-900">セッション完了</h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-stone-100 p-4">
          <div className="text-2xl font-bold text-stone-900">{reviewed}</div>
          <div className="text-xs text-stone-500">問題数</div>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <div className="text-2xl font-bold text-green-700">{correct}</div>
          <div className="text-xs text-stone-500">正解</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-4">
          <div className="text-2xl font-bold text-amber-700">{accuracy}%</div>
          <div className="text-xs text-stone-500">正答率</div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={onStartNewSession}
          className="rounded-lg bg-stone-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-700 transition-colors"
        >
          もう一回
        </button>
        <button
          onClick={onBackToDashboard}
          className="rounded-lg border border-stone-300 px-6 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          ダッシュボードへ
        </button>
      </div>
    </div>
  );
}
