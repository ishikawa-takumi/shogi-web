import { useState, type ChangeEvent } from "react";
import type { UserSettings, SidePreference, ExportBlob } from "../types/index.ts";

type Props = {
  readonly settings: UserSettings;
  readonly onSave: (patch: Partial<UserSettings>) => Promise<void>;
  readonly onExport: () => Promise<ExportBlob>;
  readonly onImport: (blob: ExportBlob) => Promise<void>;
};

const DAILY_TARGETS = [10, 20, 30] as const;
const SIDE_OPTIONS: { value: SidePreference; label: string }[] = [
  { value: "both", label: "両方" },
  { value: "sente", label: "先手のみ" },
  { value: "gote", label: "後手のみ" },
];

export function SettingsScreen({ settings, onSave, onExport, onImport }: Props) {
  const [dailyTarget, setDailyTarget] = useState(settings.dailyTarget);
  const [sidePreference, setSidePreference] = useState(settings.sidePreference);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    await onSave({ dailyTarget, sidePreference });
    setMessage("設定を保存しました。");
    setTimeout(() => setMessage(null), 2000);
  }

  async function handleExport() {
    try {
      const blob = await onExport();
      const json = JSON.stringify(blob, null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `shogi-trainer-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("エクスポートしました。");
    } catch {
      setMessage("エクスポートに失敗しました。");
    }
    setTimeout(() => setMessage(null), 2000);
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const blob: ExportBlob = JSON.parse(text);
      await onImport(blob);
      setMessage("インポートしました。");
    } catch {
      setMessage("インポートに失敗しました。");
    }
    e.target.value = "";
    setTimeout(() => setMessage(null), 2000);
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-lg font-bold text-stone-900">設定</h1>

      {message && (
        <div className="rounded-lg bg-green-100 px-4 py-2 text-sm text-green-800">
          {message}
        </div>
      )}

      {/* Daily target */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-stone-700">1日の目標問題数</label>
        <div className="mt-2 flex gap-2">
          {DAILY_TARGETS.map((t) => (
            <button
              key={t}
              onClick={() => setDailyTarget(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                dailyTarget === t
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {t}問
            </button>
          ))}
        </div>
      </div>

      {/* Side preference */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-stone-700">手番</label>
        <div className="mt-2 flex gap-2">
          {SIDE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSidePreference(value)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                sidePreference === value
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full rounded-xl bg-stone-800 py-3 text-sm font-semibold text-white hover:bg-stone-700 transition-colors"
      >
        保存
      </button>

      {/* Export/Import */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-stone-700">データ管理</h2>
        <div className="mt-3 flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 rounded-lg border border-stone-300 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
          >
            エクスポート
          </button>
          <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-stone-300 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
            インポート
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
