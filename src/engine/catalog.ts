import type {
  OpeningCatalog,
  MoveNode,
  PromptNode,
  ContentValidationIssue,
  ContentValidationReport,
} from "../types/index.ts";
import { isValidUsiMove, normalizeUsiMove, legalDestinations, canPromote, mustPromote } from "./move-validation.ts";
import { parseSfen } from "./sfen.ts";
import { usiSquareToCoord } from "../utils/coord.ts";

// ─── CatalogCache ──────────────────────────────────────────────────────────

export type CatalogCache = {
  readonly catalog: OpeningCatalog;
  readonly nodeById: ReadonlyMap<string, MoveNode>;
};

export function loadCatalog(json: string): CatalogCache {
  const catalog: OpeningCatalog = JSON.parse(json);
  const report = validateCatalogReport(catalog);
  if (!report.isValid) {
    const details = report.issues
      .map((issue, i) => `${i + 1}. ${issue.message}`)
      .join("\n");
    throw new Error(
      `コンテンツ検証で ${report.issueCount} 件のエラーを検出しました。\n${details}`,
    );
  }
  const nodeById = new Map(catalog.nodes.map((n) => [n.id, n]));
  return { catalog, nodeById };
}

// ─── Prompt Node builder ───────────────────────────────────────────────────

export function buildPromptNode(
  cache: CatalogCache,
  nodeId: string,
): PromptNode | null {
  const node = cache.nodeById.get(nodeId);
  if (!node) return null;

  const family = cache.catalog.families.find(
    (f) => f.id === node.openingFamilyId,
  );

  return {
    nodeId: node.id,
    openingFamilyId: node.openingFamilyId,
    openingNameJa: family?.nameJa ?? node.openingFamilyId,
    sfen: node.sfen,
    sideToMove: node.sideToMove,
    expectedMovesUsi: node.expectedMovesUsi,
    tags: node.tags,
    moveIndex: node.moveIndex,
    teachingComment: node.teachingComment ?? null,
  };
}

// ─── Validation ────────────────────────────────────────────────────────────

function validateFamilies(catalog: OpeningCatalog, issues: ContentValidationIssue[]): Set<string> {
  const familyIds = new Set<string>();
  for (const family of catalog.families) {
    if (familyIds.has(family.id)) {
      pushIssue(issues, `重複した family id: ${family.id}`, null, null, family.id);
    }
    familyIds.add(family.id);
  }
  return familyIds;
}

function validateLines(catalog: OpeningCatalog, familyIds: Set<string>, issues: ContentValidationIssue[]): Set<string> {
  const lineIds = new Set<string>();
  for (const line of catalog.lines) {
    if (lineIds.has(line.id)) {
      pushIssue(issues, `重複した line id: ${line.id}`, null, line.id, line.familyId);
    }
    lineIds.add(line.id);
    if (!familyIds.has(line.familyId)) {
      pushIssue(issues, `line ${line.id} の family_id が存在しません: ${line.familyId}`, null, line.id, line.familyId);
    }
  }
  return lineIds;
}

function validateNodes(catalog: OpeningCatalog, issues: ContentValidationIssue[]): Set<string> {
  const nodeIds = new Set<string>();
  for (const node of catalog.nodes) {
    if (nodeIds.has(node.id)) {
      pushIssue(issues, `重複した node id: ${node.id}`, node.id, node.lineId, node.openingFamilyId);
    }
    nodeIds.add(node.id);
    if (node.expectedMovesUsi.length === 0) {
      pushIssue(issues, `node ${node.id} に expectedMovesUsi がありません`, node.id, node.lineId, node.openingFamilyId);
    }
    for (const usi of node.expectedMovesUsi) {
      if (!isValidUsiMove(usi)) {
        pushIssue(issues, `node ${node.id} の USI が不正です: ${usi}`, node.id, node.lineId, node.openingFamilyId);
        continue;
      }
      const moveError = validateExpectedMove(node, usi);
      if (moveError) {
        pushIssue(issues, moveError, node.id, node.lineId, node.openingFamilyId);
      }
    }
    if (node.opponentAutoResponseUsi && !isValidUsiMove(node.opponentAutoResponseUsi)) {
      pushIssue(issues, `node ${node.id} の自動応手USIが不正です: ${node.opponentAutoResponseUsi}`, node.id, node.lineId, node.openingFamilyId);
    }
  }
  return nodeIds;
}

function validateCrossReferences(catalog: OpeningCatalog, _familyIds: Set<string>, lineIds: Set<string>, nodeIds: Set<string>, issues: ContentValidationIssue[]): void {
  // lines -> nodes
  for (const line of catalog.lines) {
    if (!nodeIds.has(line.rootNodeId)) {
      pushIssue(issues, `line ${line.id} の rootNodeId が存在しません: ${line.rootNodeId}`, line.rootNodeId, line.id, line.familyId);
    }
    if (line.nodeIds.length === 0) {
      pushIssue(issues, `line ${line.id} に nodeIds がありません`, null, line.id, line.familyId);
    }
    for (const nid of line.nodeIds) {
      if (!nodeIds.has(nid)) {
        pushIssue(issues, `line ${line.id} の nodeId が存在しません: ${nid}`, nid, line.id, line.familyId);
      }
    }
  }
  // families -> lines
  for (const family of catalog.families) {
    if (family.lineIds.length === 0) {
      pushIssue(issues, `family ${family.id} に lineIds がありません`, null, null, family.id);
    }
    for (const lid of family.lineIds) {
      if (!lineIds.has(lid)) {
        pushIssue(issues, `family ${family.id} の lineId が存在しません: ${lid}`, null, lid, family.id);
      }
    }
  }
  // node -> line/family consistency + next_node_id
  const lineFamilyLookup = new Map(catalog.lines.map((l) => [l.id, l.familyId]));
  for (const node of catalog.nodes) {
    const lineFamily = lineFamilyLookup.get(node.lineId);
    if (lineFamily === undefined) {
      pushIssue(issues, `node ${node.id} の lineId が存在しません: ${node.lineId}`, node.id, node.lineId, node.openingFamilyId);
      continue;
    }
    if (lineFamily !== node.openingFamilyId) {
      pushIssue(issues, `node ${node.id} の family/line 紐づけが不正です`, node.id, node.lineId, node.openingFamilyId);
    }
    if (node.nextNodeId && !nodeIds.has(node.nextNodeId)) {
      pushIssue(issues, `node ${node.id} の nextNodeId が存在しません: ${node.nextNodeId}`, node.id, node.lineId, node.openingFamilyId);
    }
  }
}

export function validateCatalogReport(
  catalog: OpeningCatalog,
): ContentValidationReport {
  const issues: ContentValidationIssue[] = [];

  if (catalog.schemaVersion !== 1) {
    pushIssue(issues, `schemaVersion=1のみ対応しています: ${catalog.schemaVersion}`);
  }
  if (catalog.families.length === 0) {
    pushIssue(issues, "opening family が空です");
  }

  const familyIds = validateFamilies(catalog, issues);
  const lineIds = validateLines(catalog, familyIds, issues);
  const nodeIds = validateNodes(catalog, issues);
  validateCrossReferences(catalog, familyIds, lineIds, nodeIds, issues);

  return { isValid: issues.length === 0, issueCount: issues.length, issues };
}

// ─── Move validation for catalog content ───────────────────────────────────

function validateExpectedMove(node: MoveNode, usi: string): string | null {
  const normalized = normalizeUsiMove(usi);

  // Drop moves: no board validation needed beyond USI format
  if (normalized.length === 4 && normalized[1] === "*") {
    return null;
  }

  // Parse the move
  const fromCoord = usiSquareToCoord(normalized.slice(0, 2));
  const toCoord = usiSquareToCoord(normalized.slice(2, 4));
  if (!fromCoord || !toCoord) {
    return `node ${node.id} の期待手の解釈に失敗しました: ${usi}`;
  }
  const withPromotion = normalized.length === 5 && normalized[4] === "+";

  // Parse the board
  const parsed = parseSfen(node.sfen);
  if (!parsed) {
    return `node ${node.id} のSFEN解析に失敗しました: ${node.sfen}`;
  }

  const piece = parsed.board[fromCoord.row]?.[fromCoord.col];
  if (!piece) {
    return `node ${node.id} の期待手の移動元に駒がありません: ${usi}`;
  }

  const expectedOwner = node.sideToMove === "sente" ? "sente" : "gote";
  if (piece.owner !== expectedOwner) {
    return `node ${node.id} の期待手の移動元が手番側の駒ではありません: ${usi}`;
  }

  const targetPiece = parsed.board[toCoord.row]?.[toCoord.col];
  if (targetPiece && targetPiece.owner === expectedOwner) {
    return `node ${node.id} の期待手は移動先に自駒があります: ${usi}`;
  }

  // Check legal move
  const destinations = legalDestinations(parsed.board, fromCoord, expectedOwner);
  const isLegal = destinations.some((d) => d.row === toCoord.row && d.col === toCoord.col);
  if (!isLegal) {
    return `node ${node.id} の期待手は駒の動きとして不正です: ${usi}`;
  }

  // Promotion checks
  if (withPromotion) {
    if (piece.pieceType.startsWith("+")) {
      return `node ${node.id} の期待手は既に成っている駒へ再度 '+' を付けています: ${usi}`;
    }
    if (!canPromote(piece, fromCoord, toCoord, expectedOwner)) {
      return `node ${node.id} の期待手は成りゾーン外なのに '+' を付けています: ${usi}`;
    }
  } else {
    if (!piece.pieceType.startsWith("+") && mustPromote(piece, toCoord, expectedOwner)) {
      return `node ${node.id} の期待手は成り必須の移動なのに '+' がありません: ${usi}`;
    }
  }

  return null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function pushIssue(
  issues: ContentValidationIssue[],
  message: string,
  nodeId: string | null = null,
  lineId: string | null = null,
  familyId: string | null = null,
): void {
  issues.push({ message, nodeId, lineId, familyId });
}
