export type TabKey = "new" | "hotlist" | "rejected" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "new", label: "To review" },
  { key: "hotlist", label: "Hotlist" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export default function FilterTabs({
  tab,
  counts,
  onTab,
  query,
  onQuery,
}: {
  tab: TabKey;
  counts: Record<TabKey, number>;
  onTab: (t: TabKey) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTab(t.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {t.label}{" "}
              <span className={active ? "text-neutral-300" : "text-neutral-400"}>
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search name, domain, city…"
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-400 sm:w-64"
      />
    </div>
  );
}
