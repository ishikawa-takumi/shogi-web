import type { DashboardState, UserSettings } from "../types/index.ts";
import { PrimaryButton } from "../components/ui/PrimaryButton.tsx";
import { Card } from "../components/ui/Card.tsx";
import { ProgressBar } from "../components/ui/ProgressBar.tsx";

type Props = {
  readonly dashboard: DashboardState;
  readonly settings: UserSettings;
  readonly onStartSession: () => void;
};

export function DashboardScreen({ dashboard, settings, onStartSession }: Props) {
  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      {/* Contextual heading */}
      <h1 className="text-lg font-semibold text-stone-800">
        {dashboard.dueCount > 0
          ? `${dashboard.dueCount}問の復習が待っています`
          : "今日の復習は完了です！"}
      </h1>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="今日の復習" value={`${dashboard.dueCount}問`} accent={dashboard.dueCount > 0 ? "amber" : "default"} />
        <StatCard label="ストリーク" value={`${dashboard.streak}日`} accent={dashboard.streak > 0 ? "green" : "default"} />
        <StatCard label="段位" value={dashboard.rankLabel} />
      </div>

      {/* Progress */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-700">習得状況</h2>
          <span className="text-xs text-stone-600">
            {dashboard.masteredCards} / {dashboard.totalCards} 習得
          </span>
        </div>

        {dashboard.openingMastery.map((m) => (
          <div key={m.openingFamilyId} className="mb-2">
            <div className="flex justify-between text-xs text-stone-600">
              <span>{m.openingNameJa}</span>
              <span>{m.masteryPercent}%</span>
            </div>
            <div className="mt-0.5">
              <ProgressBar percent={m.masteryPercent} label={m.openingNameJa + "の習得率"} />
            </div>
          </div>
        ))}
      </Card>

      {/* Start button */}
      <PrimaryButton fullWidth onClick={onStartSession} className="py-3.5 text-base">
        トレーニング開始
      </PrimaryButton>

      {/* Settings summary */}
      <div className="text-center text-xs text-stone-500">
        目標: {settings.dailyTarget}問/日 ・ 手番: {settings.sidePreference === "both" ? "両方" : settings.sidePreference === "sente" ? "先手" : "後手"}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: "amber" | "green" | "default" }) {
  const bg = accent === "amber" ? "bg-amber-50 border border-amber-200"
    : accent === "green" ? "bg-green-50 border border-green-200"
    : "bg-white shadow-sm";
  return (
    <div className={`rounded-xl p-4 text-center ${bg}`}>
      <div className="text-xl font-bold text-stone-900">{value}</div>
      <div className="mt-0.5 text-xs text-stone-600">{label}</div>
    </div>
  );
}
