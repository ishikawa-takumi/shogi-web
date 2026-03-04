import type { OpeningCatalog } from "../types/index.ts";
import { Card } from "../components/ui/Card.tsx";

type Props = {
  readonly catalog: OpeningCatalog | null;
};

const FAMILY_ACCENTS = ["border-l-amber-400", "border-l-blue-400", "border-l-green-400", "border-l-rose-400", "border-l-purple-400", "border-l-teal-400", "border-l-orange-400", "border-l-indigo-400"];

export function OpeningsScreen({ catalog }: Props) {
  if (!catalog) {
    return <div className="p-8 text-center text-stone-600">カタログを読み込めませんでした。</div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-lg font-bold text-stone-900">定跡一覧</h1>

      {catalog.families.map((family, i) => {
        const lines = catalog.lines.filter((l) => l.familyId === family.id);
        const nodes = catalog.nodes.filter((n) => n.openingFamilyId === family.id);

        return (
          <Card key={family.id} className={`border-l-4 ${FAMILY_ACCENTS[i % FAMILY_ACCENTS.length]}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">{family.nameJa}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                family.difficulty === "beginner"
                  ? "bg-green-100 text-green-700"
                  : family.difficulty === "intermediate"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}>
                {family.difficulty === "beginner" ? "入門" : family.difficulty === "intermediate" ? "中級" : "上級"}
              </span>
            </div>
            <div className="mt-1 text-xs text-stone-600">
              {lines.length} ライン ・ {nodes.length} 問題
            </div>
            <div className="mt-2 space-y-1">
              {lines.map((line) => (
                <div key={line.id} className="text-sm text-stone-600">
                  {line.nameJa}
                  <span className="ml-2 text-xs text-stone-500">
                    ({line.nodeIds.length}手)
                  </span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
