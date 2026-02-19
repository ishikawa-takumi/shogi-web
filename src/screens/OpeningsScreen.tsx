import type { OpeningCatalog, OpeningFamily } from "../types/index.ts";

type Props = {
  readonly catalog: OpeningCatalog | null;
};

export function OpeningsScreen({ catalog }: Props) {
  if (!catalog) {
    return <div className="p-8 text-center text-stone-500">カタログを読み込めませんでした。</div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-lg font-bold text-stone-900">定跡一覧</h1>

      {catalog.families.map((family) => {
        const lines = catalog.lines.filter((l) => l.familyId === family.id);
        const nodes = catalog.nodes.filter((n) => n.openingFamilyId === family.id);

        return (
          <div key={family.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">{family.nameJa}</h2>
              <span className="text-xs text-stone-400">
                {family.difficulty === "beginner" ? "入門" : "中級"}
              </span>
            </div>
            <div className="mt-1 text-xs text-stone-500">
              {lines.length} ライン ・ {nodes.length} ノード
            </div>
            <div className="mt-2 space-y-1">
              {lines.map((line) => (
                <div key={line.id} className="text-sm text-stone-600">
                  {line.nameJa}
                  <span className="ml-2 text-xs text-stone-400">
                    ({line.nodeIds.length}手)
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
