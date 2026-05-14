export function OptionGroup<T extends string>({
  label,
  options,
  value,
  labels,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-black text-slate-800">{label}</legend>
      <div className="flex flex-wrap gap-2" role="list">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="listitem"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              value === option ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
