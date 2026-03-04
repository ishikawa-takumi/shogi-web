import type { Coord, HintLadder, HintLevel, PromptNode } from "../types/index.ts";
import { usiSquareToCoord } from "../utils/coord.ts";
import { pieceToJapanese } from "../utils/piece-labels.ts";

export function buildHintLadder(prompt: PromptNode | null): HintLadder | null {
  if (!prompt || prompt.expectedMovesUsi.length === 0) {
    return null;
  }

  const primaryMove = prompt.expectedMovesUsi[0]?.toLowerCase();
  if (!primaryMove) {
    return null;
  }

  const moveIntent = describeStrategicIntent(prompt, primaryMove);
  const practicalHint = describePracticalHint(prompt, primaryMove);
  const openingIntent = describeOpeningIntent(prompt.tags);
  const explicitHint = describeExplicitHint(primaryMove);

  return {
    l1: `L1: ${moveIntent} ${openingIntent}`.trim(),
    l2: `L2: ${practicalHint}`,
    l3: `L3: ${explicitHint}`,
  };
}

export function resolveHintText(ladder: HintLadder | null, level: HintLevel): string | null {
  if (!ladder || level === 0) {
    return null;
  }
  if (level === 1) {
    return ladder.l1;
  }
  if (level === 2) {
    return ladder.l2;
  }
  return ladder.l3;
}

export function hintButtonLabel(level: HintLevel): string {
  if (level === 0) {
    return "ヒントを見る";
  }
  if (level >= 3) {
    return "ヒントを隠す";
  }
  return "もっとヒント";
}

function describeStrategicIntent(_prompt: PromptNode, primaryMove: string): string {
  const dropMatch = primaryMove.match(/^([plnsgbrk])\*([1-9][a-i])$/);
  if (dropMatch) {
    const pieceJa = pieceToJapanese(dropMatch[1].toUpperCase());
    return `${pieceJa}を打って利きを増やし、相手の動きを制限する狙いです。`;
  }

  const normalMatch = primaryMove.match(/^([1-9][a-i])([1-9][a-i])(\+)?$/);
  if (normalMatch) {
    const promoted = Boolean(normalMatch[3]);
    const intent = "この一手は盤面の主導権を維持するための要点です。";

    if (promoted) {
      return `${intent} 成ることで駒の働きを上げ、拠点を作りやすくします。`;
    }
    return intent;
  }

  return "この一手は次の展開で主導権を握るための準備です。";
}

function describePracticalHint(prompt: PromptNode, primaryMove: string): string {
  const dropMatch = primaryMove.match(/^([plnsgbrk])\*([1-9][a-i])$/);
  if (dropMatch) {
    const pieceJa = pieceToJapanese(dropMatch[1].toUpperCase());
    return `持ち駒の${pieceJa}を使う手が候補です。相手の急所に利きを通してください。`;
  }

  const normalMatch = primaryMove.match(/^([1-9][a-i])([1-9][a-i])(\+)?$/);
  if (normalMatch) {
    const from = usiSquareToCoord(normalMatch[1]);
    const to = usiSquareToCoord(normalMatch[2]);
    const direction = from && to ? describeDirection(from, to, prompt.sideToMove) : "前進";
    const promoteHint = normalMatch[3] ? " 成りを絡める意識を持ってください。" : "";
    return `駒を${direction}へ動かす方針です。${promoteHint}`.trim();
  }

  return "次の一手で形を整える手を選んでください。";
}

function describeExplicitHint(primaryMove: string): string {
  return `正解手は ${primaryMove} です。`;
}

function describeOpeningIntent(tags: readonly string[]): string {
  if (tags.includes("歩交換")) {
    return "歩交換の流れでは、手損を避けてテンポを保つことが重要です。";
  }
  if (tags.includes("テンポ") || tags.includes("速度")) {
    return "この局面は速度勝負なので、最短で狙いを実現する手を意識してください。";
  }
  if (tags.includes("玉移動") || tags.includes("安全") || tags.includes("囲い") || tags.includes("受け")) {
    return "玉の安全度を上げると、次の局面で攻めに集中しやすくなります。";
  }
  if (tags.includes("寄せ") || tags.includes("終盤入口")) {
    return "終盤入口では駒得より速度を優先し、相手玉への迫りを切らさないのがポイントです。";
  }
  if (tags.includes("矢倉") || tags.includes("組み") || tags.includes("完成")) {
    return "囲いの完成度を高めることで、攻防の判断が安定します。";
  }
  return "次の相手の応手を想定し、狙いを継続できる形を意識しましょう。";
}

function describeDirection(from: Coord, to: Coord, side: "sente" | "gote"): string {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const forward = side === "sente" ? dr < 0 : dr > 0;
  const backward = side === "sente" ? dr > 0 : dr < 0;

  if (forward && dc === 0) {
    return "まっすぐ前";
  }
  if (forward && dc !== 0) {
    return "前方";
  }
  if (backward && dc === 0) {
    return "後方";
  }
  if (dc !== 0) {
    return "横方向";
  }
  return "要所";
}
