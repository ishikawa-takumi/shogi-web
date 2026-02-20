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
import { composeMistakeFirstQueue } from "./engine/srs.ts";
import { matchesSidePreference } from "./engine/session.ts";
import { exportProgress, importProgress } from "./db/export-import.ts";
import { appendSessionHistory } from "./db/session-history.ts";
import { todayString } from "./utils/date.ts";
import type { ExportBlob } from "./types/index.ts";

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [loading, setLoading] = useState(true);

  const catalog = useCatalogStore();
  const settings = useSettingsStore();
  const review = useReviewStore();
  const session = useSessionStore();
  const dashboard = useDashboardStore();

  // ─── Initialization ────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      catalog.initialize();
      const familyIds = useCatalogStore.getState().allFamilyIds;
      await settings.load(familyIds);
      await review.load();
      const families = useCatalogStore.getState().cache?.catalog.families ?? [];
      await dashboard.compute(useReviewStore.getState().cards, [...families]);
      setLoading(false);
    }
    void init();
  }, []);

  // ─── Session management ────────────────────────────────────────────────
  const startSession = useCallback(() => {
    const { cards } = useReviewStore.getState();
    const { settings: s } = useSettingsStore.getState();
    const cache = useCatalogStore.getState().cache;
    if (!cache) return;

    const now = new Date();

    // Collect eligible node IDs
    const allNodes = cache.catalog.nodes;
    const selectedSet = new Set(s.selectedFamilyIds);

    const eligible = allNodes.filter(
      (n) => selectedSet.has(n.openingFamilyId) && matchesSidePreference(s.sidePreference, n.sideToMove),
    );

    const cardMap = new Map(cards.map((c) => [c.nodeId, c]));

    const dueIds: string[] = [];
    const rawNewIds: string[] = [];
    const mistakeIds: string[] = [];

    for (const node of eligible) {
      const card = cardMap.get(node.id);
      if (!card) {
        rawNewIds.push(node.id);
        continue;
      }
      if (card.lastResult === "incorrect") {
        mistakeIds.push(node.id);
      }
      if (new Date(card.dueAt) <= now) {
        dueIds.push(node.id);
      }
    }

    // For sequential opening lines, only include a new node if its predecessor
    // has been seen before or is already in this session's queue.
    // This prevents showing yagura move 3 before the user has learned moves 1-2.
    // Standalone puzzles (tsume) have no nextNodeId links, so they pass through.
    const inQueue = new Set([...dueIds, ...mistakeIds]);
    const newIds: string[] = [];

    for (const id of rawNewIds) {
      const predecessor = allNodes.find((n) => n.nextNodeId === id);
      if (!predecessor || cardMap.has(predecessor.id) || inQueue.has(predecessor.id)) {
        newIds.push(id);
        inQueue.add(id);
      }
    }

    const queue = composeMistakeFirstQueue(mistakeIds, dueIds, newIds, s.dailyTarget);
    session.startSession([...queue]);
    setScreen("training");
  }, []);

  const handleSessionEnd = useCallback(async () => {
    const { reviewedCount, correctCount, active } = useSessionStore.getState();
    if (reviewedCount > 0) {
      await appendSessionHistory(todayString(), reviewedCount, correctCount);
    }
    session.reset();
    // Refresh dashboard
    const families = useCatalogStore.getState().cache?.catalog.families ?? [];
    await dashboard.compute(useReviewStore.getState().cards, [...families]);
    setScreen("dashboard");
  }, []);

  const handleSubmitMove = useCallback((usi: string) => {
    const nodeId = useSessionStore.getState().currentNodeId();
    if (!nodeId) throw new Error("No current node");
    const prompt = useCatalogStore.getState().getPrompt(nodeId);
    if (!prompt) throw new Error("Prompt not found");
    const card = useReviewStore.getState().cards.find((c) => c.nodeId === nodeId);
    return useSessionStore.getState().submitMove(usi, prompt, card);
  }, []);

  const handleAdvance = useCallback(() => {
    return useSessionStore.getState().advance();
  }, []);

  const handleSaveCard = useCallback(async (card: Parameters<typeof review.upsert>[0]) => {
    await useReviewStore.getState().upsert(card);
  }, []);

  const handleExport = useCallback(async () => {
    return exportProgress(useSettingsStore.getState().settings);
  }, []);

  const handleImport = useCallback(async (blob: ExportBlob) => {
    const familyIds = useCatalogStore.getState().allFamilyIds;
    await importProgress(blob, familyIds);
    await review.load();
    await settings.load(familyIds);
    const families = useCatalogStore.getState().cache?.catalog.families ?? [];
    await dashboard.compute(useReviewStore.getState().cards, [...families]);
  }, []);

  const handleSaveSettings = useCallback(async (patch: Partial<typeof settings.settings>) => {
    await useSettingsStore.getState().update(patch);
  }, []);

  const handleReset = useCallback(async () => {
    const familyIds = useCatalogStore.getState().allFamilyIds;
    await review.reset();
    await settings.load(familyIds);
    const families = useCatalogStore.getState().cache?.catalog.families ?? [];
    await dashboard.compute(useReviewStore.getState().cards, [...families]);
  }, []);

  // ─── Loading / Error states ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-500">
        読込中...
      </div>
    );
  }

  if (catalog.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-red-600">
        エラー: {catalog.error}
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
          currentIndex={session.currentIndex}
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
    </div>
  );
}
