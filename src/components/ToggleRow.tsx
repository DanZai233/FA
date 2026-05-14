export function ToggleRow({
  checked,
  label,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const labelId = `toggle-${label.replace(/\s+/g, '-')}`;
  return (
    <button
      type="button"
      id={labelId}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`flex w-full items-center justify-between rounded-3xl bg-slate-50 p-4 text-left ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      <span className="text-sm font-black text-slate-900">{label}</span>
      <span className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${checked ? 'bg-rose-600' : 'bg-slate-300'}`}>
        <span className={`block h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}
