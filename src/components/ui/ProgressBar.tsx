type Props = {
  readonly percent: number;
  readonly label: string;
};

export function ProgressBar({ percent, label }: Props) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-stone-100"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full bg-amber-500 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
