type RadioOption<T extends string | number> = {
  readonly value: T;
  readonly label: string;
};

type Props<T extends string | number> = {
  readonly label: string;
  readonly options: readonly RadioOption<T>[];
  readonly selected: T;
  readonly onChange: (value: T) => void;
};

export function RadioGroup<T extends string | number>({ label, options, selected, onChange }: Props<T>) {
  return (
    <div>
      <label className="text-sm font-medium text-stone-700">{label}</label>
      <div className="mt-2 flex gap-2" role="radiogroup" aria-label={label}>
        {options.map(({ value, label: optLabel }) => (
          <button
            key={String(value)}
            role="radio"
            aria-checked={selected === value}
            onClick={() => onChange(value)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              selected === value
                ? "bg-amber-600 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {optLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
