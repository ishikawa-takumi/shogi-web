import type { SidePreference, SideToMove } from "../types/index.ts";
import { normalizeDailyTarget } from "./srs.ts";

// ─── isTsumeFamilyId ────────────────────────────────────────────────────────

export function isTsumeFamilyId(familyId: string): boolean {
  return familyId === "tsume" || familyId.startsWith("tsume-");
}

// ─── normalizeSessionTarget ─────────────────────────────────────────────────

export function normalizeSessionTarget(
  rawTarget: number,
  selectedFamilies: string[]
): number {
  if (
    rawTarget === 15 &&
    selectedFamilies.length > 0 &&
    selectedFamilies.every(isTsumeFamilyId)
  ) {
    return 15;
  }
  return normalizeDailyTarget(rawTarget);
}

// ─── filterNonTsumeFamilyIds ─────────────────────────────────────────────────

export function filterNonTsumeFamilyIds(familyIds: string[]): string[] {
  return familyIds.filter((id) => !isTsumeFamilyId(id));
}

// ─── sanitizeFamilyIds ───────────────────────────────────────────────────────

export function sanitizeFamilyIds(
  selected: string[],
  allowed: string[]
): string[] {
  const allowedSet = new Set(allowed);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of selected) {
    if (allowedSet.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }

  return result;
}

// ─── matchesSidePreference ───────────────────────────────────────────────────

export function matchesSidePreference(
  preference: SidePreference,
  side: SideToMove
): boolean {
  if (preference === "both") return true;
  return preference === side;
}
