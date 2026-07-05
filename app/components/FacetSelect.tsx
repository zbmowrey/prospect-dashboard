export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

// A single dependency-free dropdown facet (native select for accessibility).
export default function FacetSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel?: string;
  value: string;
  options: FacetOption[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-neutral-400"
    >
      <option value="">{allLabel ?? `All ${label}`}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label} ({o.count})
        </option>
      ))}
    </select>
  );
}
