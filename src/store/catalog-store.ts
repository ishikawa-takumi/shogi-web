import { create } from "zustand";
import type { OpeningCatalog, OpeningFamily, MoveNode, PromptNode } from "../types/index.ts";
import { type CatalogCache, loadCatalog, buildPromptNode } from "../engine/catalog.ts";
import catalogJsonRaw from "../../content/opening_catalog_v1.json";

type CatalogState = {
  readonly cache: CatalogCache | null;
  readonly error: string | null;
  readonly allFamilyIds: readonly string[];
};

type CatalogActions = {
  readonly initialize: () => void;
  readonly getNode: (nodeId: string) => MoveNode | undefined;
  readonly getPrompt: (nodeId: string) => PromptNode | null;
  readonly getFamily: (familyId: string) => OpeningFamily | undefined;
  readonly getCatalog: () => OpeningCatalog | null;
};

export const useCatalogStore = create<CatalogState & CatalogActions>((set, get) => ({
  cache: null,
  error: null,
  allFamilyIds: [],

  initialize: () => {
    try {
      const cache = loadCatalog(JSON.stringify(catalogJsonRaw));
      set({
        cache,
        error: null,
        allFamilyIds: cache.catalog.families.map((f) => f.id),
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  getNode: (nodeId) => get().cache?.nodeById.get(nodeId),

  getPrompt: (nodeId) => {
    const { cache } = get();
    return cache ? buildPromptNode(cache, nodeId) : null;
  },

  getFamily: (familyId) =>
    get().cache?.catalog.families.find((f) => f.id === familyId),

  getCatalog: () => get().cache?.catalog ?? null,
}));
