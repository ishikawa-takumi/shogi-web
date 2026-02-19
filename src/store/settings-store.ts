import { create } from "zustand";
import type { UserSettings, SidePreference } from "../types/index.ts";
import { getOrCreateSettings, saveSettings, defaultSettings } from "../db/settings.ts";

type SettingsState = {
  readonly settings: UserSettings;
  readonly loaded: boolean;
};

type SettingsActions = {
  readonly load: (allFamilyIds: readonly string[]) => Promise<void>;
  readonly update: (patch: Partial<UserSettings>) => Promise<void>;
  readonly completeOnboarding: () => Promise<void>;
};

const INITIAL_SETTINGS: UserSettings = {
  dailyTarget: 20,
  sidePreference: "both",
  selectedFamilyIds: [],
  onboarded: false,
};

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  settings: INITIAL_SETTINGS,
  loaded: false,

  load: async (allFamilyIds) => {
    const settings = await getOrCreateSettings(allFamilyIds);
    set({ settings, loaded: true });
  },

  update: async (patch) => {
    const current = get().settings;
    const merged: UserSettings = {
      dailyTarget: patch.dailyTarget ?? current.dailyTarget,
      sidePreference: patch.sidePreference ?? current.sidePreference,
      selectedFamilyIds: patch.selectedFamilyIds ?? current.selectedFamilyIds,
      onboarded: patch.onboarded ?? current.onboarded,
    };
    await saveSettings(merged);
    set({ settings: merged });
  },

  completeOnboarding: async () => {
    await get().update({ onboarded: true });
  },
}));
