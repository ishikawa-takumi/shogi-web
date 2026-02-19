type Props = {
  readonly completed: number;
  readonly total: number;
  readonly correct: number;
};

export function SessionProgress({ completed, total, correct }: Props) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>{completed} / {total} 問</span>
        <span>正答率 {accuracy}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-stone-700 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
