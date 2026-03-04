import { PrimaryButton } from "../ui/PrimaryButton.tsx";
import { SecondaryButton } from "../ui/SecondaryButton.tsx";

type Props = {
  readonly reviewed: number;
  readonly correct: number;
  readonly onBackToDashboard: () => void;
  readonly onStartNewSession: () => void;
};

export function SessionSummary({ reviewed, correct, onBackToDashboard, onStartNewSession }: Props) {
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;

  return (
    <div className="mx-auto max-w-md pt-12 space-y-6 text-center">
      <p className={`text-2xl font-bold ${
        accuracy >= 90 ? "text-green-700" : accuracy >= 60 ? "text-amber-700" : "text-stone-700"
      }`}>
        {accuracy >= 90 ? "素晴らしい！" : accuracy >= 60 ? "いい調子！" : "練習あるのみ！"}
      </p>
      <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wider">セッション完了</h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-stone-100 p-4">
          <div className="text-2xl font-bold text-stone-900">{reviewed}</div>
          <div className="text-xs text-stone-600">問題数</div>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <div className="text-2xl font-bold text-green-700">{correct}</div>
          <div className="text-xs text-stone-600">正解</div>
        </div>
        <div className={`rounded-lg p-4 ${
          accuracy >= 90 ? "bg-green-100 border border-green-300" : accuracy >= 60 ? "bg-amber-100 border border-amber-300" : "bg-stone-100 border border-stone-300"
        }`}>
          <div className="text-2xl font-bold text-amber-700">{accuracy}%</div>
          <div className="text-xs text-stone-600">正答率</div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <PrimaryButton onClick={onStartNewSession} className="px-8">
          もう一回
        </PrimaryButton>
        <SecondaryButton onClick={onBackToDashboard} className="px-6">
          ダッシュボードへ
        </SecondaryButton>
      </div>
    </div>
  );
}
