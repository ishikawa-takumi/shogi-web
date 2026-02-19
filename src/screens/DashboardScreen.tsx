import type { DashboardState, UserSettings } from "../types/index.ts";

type Props = {
  readonly dashboard: DashboardState;
  readonly settings: UserSettings;
  readonly onStartSession: () => void;
};

export function DashboardScreen({ dashboard, settings, onStartSession }: Props) {
  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="今日の復習" value={`${dashboard.dueCount}問`} />
        <StatCard label="ストリーク" value={`${dashboard.streak}日`} />
        <StatCard label="段位" value={dashboard.rankLabel} />
      </div>

      {/* Progress */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">習得状況</h2>
          <span className="text-xs text-stone-500">
            {dashboard.masteredCards} / {dashboard.totalCards} 習得
          </span>
        </div>

        {dashboard.openingMastery.map((m) => (
          <div key={m.openingFamilyId} className="mb-2">
            <div className="flex justify-between text-xs text-stone-600">
              <span>{m.openingNameJa}</span>
              <span>{m.masteryPercent}%</span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-stone-600 transition-all"
                style={{ width: `${m.masteryPercent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Start button */}
      <button
        onClick={onStartSession}
        className="w-full rounded-xl bg-stone-800 py-3.5 text-base font-semibold text-white hover:bg-stone-700 transition-colors"
      >
        トレーニング開始
      </button>

      {/* Settings summary */}
      <div className="text-center text-xs text-stone-400">
        目標: {settings.dailyTarget}問/日 ・ 手番: {settings.sidePreference === "both" ? "両方" : settings.sidePreference === "sente" ? "先手" : "後手"}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
      <div className="text-xl font-bold text-stone-900">{value}</div>
      <div className="mt-0.5 text-xs text-stone-500">{label}</div>
    </div>
  );
}
