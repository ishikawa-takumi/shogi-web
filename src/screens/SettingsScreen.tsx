import { useState, type ChangeEvent } from "react";
import type { UserSettings, SidePreference, ExportBlob } from "../types/index.ts";
import { PrimaryButton } from "../components/ui/PrimaryButton.tsx";
import { SecondaryButton } from "../components/ui/SecondaryButton.tsx";
import { Card } from "../components/ui/Card.tsx";
import { RadioGroup } from "../components/ui/RadioGroup.tsx";

type Props = {
  readonly settings: UserSettings;
  readonly onSave: (patch: Partial<UserSettings>) => Promise<void>;
  readonly onExport: () => Promise<ExportBlob>;
  readonly onImport: (blob: ExportBlob) => Promise<void>;
  readonly onReset: () => Promise<void>;
};

const DAILY_TARGET_OPTIONS = [
  { value: 10, label: "10問" },
  { value: 20, label: "20問" },
  { value: 30, label: "30問" },
] as const;

const SIDE_OPTIONS: readonly { value: SidePreference; label: string }[] = [
  { value: "both", label: "両方" },
  { value: "sente", label: "先手のみ" },
  { value: "gote", label: "後手のみ" },
];

export function SettingsScreen({ settings, onSave, onExport, onImport, onReset }: Props) {
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

  async function handleReset() {
    if (!window.confirm("学習データをすべて削除しますか？この操作は元に戻せません。")) return;
    try {
      await onReset();
      setMessage("データをリセットしました。");
    } catch {
      setMessage("リセットに失敗しました。");
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
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg px-4 py-2 text-sm ${
            message.includes("失敗") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          {message}
        </div>
      )}

      <Card className="space-y-4">
        <RadioGroup
          label="1日の目標問題数"
          options={DAILY_TARGET_OPTIONS}
          selected={dailyTarget}
          onChange={setDailyTarget}
        />
        <RadioGroup
          label="手番"
          options={SIDE_OPTIONS}
          selected={sidePreference}
          onChange={setSidePreference}
        />
        <PrimaryButton fullWidth onClick={handleSave}>
          保存
        </PrimaryButton>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-medium text-stone-700">データ管理</h2>
        <div className="flex gap-2">
          <SecondaryButton className="flex-1" onClick={handleExport}>
            エクスポート
          </SecondaryButton>
          <label className="flex-1">
            <SecondaryButton className="w-full" onClick={() => document.getElementById("import-input")?.click()}>
              インポート
            </SecondaryButton>
            <input
              id="import-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>
        <SecondaryButton variant="danger" fullWidth onClick={handleReset}>
          学習データをリセット
        </SecondaryButton>
      </Card>
    </div>
  );
}
