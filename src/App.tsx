import { useEffect, useState, useCallback } from "react";
import type { Screen } from "./components/layout/NavBar.tsx";
import { NavBar } from "./components/layout/NavBar.tsx";
import { DashboardScreen } from "./screens/DashboardScreen.tsx";
import { TrainingScreen } from "./screens/TrainingScreen.tsx";
import { OpeningsScreen } from "./screens/OpeningsScreen.tsx";
import { SettingsScreen } from "./screens/SettingsScreen.tsx";
import { useCatalogStore } from "./store/catalog-store.ts";
import { useSettingsStore } from "./store/settings-store.ts";
import { useReviewStore } from "./store/review-store.ts";
import { useSessionStore } from "./store/session-store.ts";
import { useDashboardStore } from "./store/dashboard-store.ts";
import { buildSessionQueue } from "./engine/queue-builder.ts";
import { exportProgress, importProgress } from "./db/export-import.ts";
import { appendSessionHistory } from "./db/session-history.ts";
import { todayString } from "./utils/date.ts";
import type { ExportBlob, ReviewCard } from "./types/index.ts";

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [loading, setLoading] = useState(true);

  const catalog = useCatalogStore();
  const settings = useSettingsStore();
  const session = useSessionStore();
  const dashboard = useDashboardStore();

  // ─── Shared helpers ────────────────────────────────────────────────────
  const refreshDashboard = useCallback(async () => {
    const families = useCatalogStore.getState().cache?.catalog.families ?? [];
    await useDashboardStore.getState().compute(useReviewStore.getState().cards, [...families]);
  }, []);

  // ─── Initialization ────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      useCatalogStore.getState().initialize();
      const familyIds = useCatalogStore.getState().allFamilyIds;
      await useSettingsStore.getState().load(familyIds);
      await useReviewStore.getState().load();
      await refreshDashboard();
      setLoading(false);
    }
    void init();
  }, [refreshDashboard]);

  // ─── Session management ────────────────────────────────────────────────
  const startSession = useCallback(() => {
    const { cards } = useReviewStore.getState();
    const { settings: s } = useSettingsStore.getState();
    const cache = useCatalogStore.getState().cache;
    if (!cache) return;

    const queue = buildSessionQueue({
      allNodes: cache.catalog.nodes,
      cards,
      selectedFamilyIds: s.selectedFamilyIds,
      sidePreference: s.sidePreference,
      dailyTarget: s.dailyTarget,
    });
    useSessionStore.getState().startSession([...queue]);
    setScreen("training");
  }, []);

  const handleSessionEnd = useCallback(async () => {
    const { reviewedCount, correctCount } = useSessionStore.getState();
    if (reviewedCount > 0) {
      await appendSessionHistory(todayString(), reviewedCount, correctCount);
    }
    useSessionStore.getState().reset();
    await refreshDashboard();
    setScreen("dashboard");
  }, [refreshDashboard]);

  const handleSubmitMove = useCallback((usi: string) => {
    const nodeId = useSessionStore.getState().currentNodeId();
    if (!nodeId) throw new Error("No current node");
    const prompt = useCatalogStore.getState().getPrompt(nodeId);
    if (!prompt) throw new Error("Prompt not found");
    const card = useReviewStore.getState().cards.find((c) => c.nodeId === nodeId);
    return useSessionStore.getState().submitMove(usi, prompt, card);
  }, []);

  const handleAdvance = useCallback(() => {
    useSessionStore.getState().advance();
  }, []);

  const handleSaveCard = useCallback(async (card: ReviewCard) => {
    await useReviewStore.getState().upsert(card);
  }, []);

  const handleExport = useCallback(async () => {
    return exportProgress(useSettingsStore.getState().settings);
  }, []);

  const handleImport = useCallback(async (blob: ExportBlob) => {
    const familyIds = useCatalogStore.getState().allFamilyIds;
    await importProgress(blob, familyIds);
    await useReviewStore.getState().load();
    await useSettingsStore.getState().load(familyIds);
    await refreshDashboard();
  }, [refreshDashboard]);

  const handleSaveSettings = useCallback(async (patch: Partial<ReturnType<typeof useSettingsStore.getState>["settings"]>) => {
    await useSettingsStore.getState().update(patch);
  }, []);

  const handleReset = useCallback(async () => {
    const familyIds = useCatalogStore.getState().allFamilyIds;
    await useReviewStore.getState().reset();
    await useSettingsStore.getState().load(familyIds);
    await refreshDashboard();
  }, [refreshDashboard]);

  // ─── Loading / Error states ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="text-3xl animate-bounce">&#9823;</div>
          <p className="text-sm font-medium tracking-wide text-stone-600">読込中...</p>
        </div>
      </div>
    );
  }

  if (catalog.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="mx-auto max-w-sm rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-base font-semibold text-red-800">エラー</p>
          <p className="mt-2 text-sm text-red-600">{catalog.error}</p>
        </div>
      </div>
    );
  }

  // ─── Current prompt for training ───────────────────────────────────────
  const currentNodeId = session.currentNodeId();
  const currentPrompt = currentNodeId ? catalog.getPrompt(currentNodeId) : null;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">
      {screen !== "training" && <NavBar current={screen} onNavigate={setScreen} />}

      <main>
        {screen === "dashboard" && (
          <DashboardScreen
            dashboard={dashboard}
            settings={settings.settings}
            onStartSession={startSession}
          />
        )}

        {screen === "training" && (
          <TrainingScreen
            prompt={currentPrompt}
            onSubmitMove={handleSubmitMove}
            onSaveCard={handleSaveCard}
            onAdvance={handleAdvance}
            onSessionEnd={handleSessionEnd}
            sessionQueue={session.queue}
            reviewedCount={session.reviewedCount}
            correctCount={session.correctCount}
          />
        )}

        {screen === "openings" && <OpeningsScreen catalog={catalog.getCatalog()} />}

        {screen === "settings" && (
          <SettingsScreen
            settings={settings.settings}
            onSave={handleSaveSettings}
            onExport={handleExport}
            onImport={handleImport}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
