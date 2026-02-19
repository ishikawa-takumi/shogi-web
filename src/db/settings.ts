import type { UserSettings, SidePreference } from "../types/index.ts";
import { db, type SettingsRow } from "./schema.ts";
import { normalizeDailyTarget } from "../engine/srs.ts";
import { sanitizeFamilyIds } from "../engine/session.ts";

const SETTINGS_ID = 1;

function rowToSettings(row: SettingsRow, allFamilyIds: readonly string[]): UserSettings {
  const parsed: string[] = JSON.parse(row.selectedFamilyIds);
  const sanitized = sanitizeFamilyIds(parsed, [...allFamilyIds]);
  const selected = sanitized.length > 0 ? sanitized : [...allFamilyIds];

  return {
    dailyTarget: normalizeDailyTarget(row.dailyTarget) as 10 | 20 | 30,
    sidePreference: row.sidePreference as SidePreference,
    selectedFamilyIds: selected,
    onboarded: row.onboarded === 1,
  };
}

function settingsToRow(settings: UserSettings): SettingsRow {
  return {
    id: SETTINGS_ID,
    dailyTarget: settings.dailyTarget,
    sidePreference: settings.sidePreference,
    selectedFamilyIds: JSON.stringify(settings.selectedFamilyIds),
    onboarded: settings.onboarded ? 1 : 0,
    updatedAt: new Date().toISOString(),
  };
}

export function defaultSettings(allFamilyIds: readonly string[]): UserSettings {
  return {
    dailyTarget: 20,
    sidePreference: "both",
    selectedFamilyIds: [...allFamilyIds],
    onboarded: false,
  };
}

export async function getOrCreateSettings(
  allFamilyIds: readonly string[],
): Promise<UserSettings> {
  const row = await db.settings.get(SETTINGS_ID);
  if (row) {
    return rowToSettings(row, allFamilyIds);
  }
  const settings = defaultSettings(allFamilyIds);
  await db.settings.put(settingsToRow(settings));
  return settings;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await db.settings.put(settingsToRow(settings));
}
