import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { OpeningCatalog, MoveNode } from "../../src/types/index.ts";
import { applyUsiMove } from "../../src/engine/sfen-apply.ts";

const catalogPath = resolve(__dirname, "../../content/opening_catalog_v1.json");
const catalog: OpeningCatalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
const nodeById = new Map(catalog.nodes.map((n) => [n.id, n]));

describe("SFEN consistency", () => {
  for (const line of catalog.lines) {
    const nodes: MoveNode[] = [];
    for (const nid of line.nodeIds) {
      const node = nodeById.get(nid);
      if (node) nodes.push(node);
    }

    // Collect chained pairs (skip standalone nodes like 1手詰)
    const pairs: { current: MoveNode; next: MoveNode }[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const current = nodes[i];
      const next = nodes[i + 1];
      if (
        current.nextNodeId === next.id &&
        current.opponentAutoResponseUsi !== null
      ) {
        pairs.push({ current, next });
      }
    }

    if (pairs.length === 0) continue; // Skip lines with no chains (e.g. tsume-one-move)

    describe(`line: ${line.nameJa} (${line.id})`, () => {
      for (const { current, next } of pairs) {
        it(`node ${current.id} → ${next.id}: derived SFEN matches`, () => {
          // Apply the expected move (sente/gote's answer)
          const afterExpected = applyUsiMove(
            current.sfen,
            current.expectedMovesUsi[0],
          );
          // Apply the opponent auto-response
          const afterOpponent = applyUsiMove(
            afterExpected,
            current.opponentAutoResponseUsi!,
          );

          // The next node's SFEN should match the derived position
          expect(afterOpponent).toBe(next.sfen);
        });
      }
    });
  }
});
