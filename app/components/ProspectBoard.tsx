"use client";

import { useEffect, useMemo, useState } from "react";
import type { CaptureStatus, ProspectDTO, ProspectStatus } from "@/lib/types";
import ProspectCard from "./ProspectCard";
import FilterTabs, { type TabKey } from "./FilterTabs";
import FacetSelect, { type FacetOption } from "./FacetSelect";

// Default view = "ready to review": untriaged (new) prospects that have been
// captured, so pending/failed ones don't clutter the triage queue.
const DEFAULT_TAB: TabKey = "new";
const DEFAULT_CAPTURE = "captured";

function facetOptions(items: ProspectDTO[], key: "industry" | "city"): FacetOption[] {
  const m = new Map<string, number>();
  for (const p of items) {
    const v = p[key];
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, label: value, count }));
}

export default function ProspectBoard({
  initialProspects,
}: {
  initialProspects: ProspectDTO[];
}) {
  const [items, setItems] = useState<ProspectDTO[]>(initialProspects);
  const [tab, setTab] = useState<TabKey>(DEFAULT_TAB);
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [capture, setCapture] = useState<string>(DEFAULT_CAPTURE);
  const [query, setQuery] = useState("");

  // While any capture is pending, poll so freshly-shot thumbnails appear.
  const hasPending = items.some((p) => p.captureStatus === "pending");
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/prospects", { cache: "no-store" });
        if (res.ok) setItems((await res.json()) as ProspectDTO[]);
      } catch {
        /* ignore transient errors */
      }
    }, 4000);
    return () => clearInterval(t);
  }, [hasPending]);

  async function onSetStatus(id: number, status: ProspectStatus) {
    const prev = items;
    setItems((cur) => cur.map((p) => (p.id === id ? { ...p, status } : p)));
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      setItems(prev); // revert on failure
    }
  }

  async function onRetry(id: number) {
    setItems((cur) =>
      cur.map((p) =>
        p.id === id ? { ...p, captureStatus: "pending", captureError: null } : p,
      ),
    );
    try {
      await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captureStatus: "pending" }),
      });
    } catch {
      /* worker poll will still pick up any persisted change */
    }
  }

  const counts: Record<TabKey, number> = useMemo(
    () => ({
      new: items.filter((p) => p.status === "new").length,
      hotlist: items.filter((p) => p.status === "hotlist").length,
      rejected: items.filter((p) => p.status === "rejected").length,
      all: items.length,
    }),
    [items],
  );

  const capturedCount = useMemo(
    () => items.filter((p) => p.captureStatus === "captured").length,
    [items],
  );

  const industryOptions = useMemo(() => facetOptions(items, "industry"), [items]);
  const cityOptions = useMemo(() => facetOptions(items, "city"), [items]);
  const captureOptions: FacetOption[] = useMemo(() => {
    const by = (s: CaptureStatus) =>
      items.filter((p) => p.captureStatus === s).length;
    return [
      { value: "captured", label: "Captured", count: by("captured") },
      { value: "pending", label: "Capturing", count: by("pending") },
      { value: "failed", label: "Failed", count: by("failed") },
    ];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (tab !== "all" && p.status !== tab) return false;
      if (industry && p.industry !== industry) return false;
      if (city && p.city !== city) return false;
      if (capture && p.captureStatus !== capture) return false;
      if (q) {
        const hay = [p.name, p.domain, p.city, p.state, p.industry, p.notes].filter(
          Boolean,
        );
        if (!hay.some((v) => (v as string).toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [items, tab, industry, city, capture, query]);

  const isDefaultView =
    tab === DEFAULT_TAB &&
    !industry &&
    !city &&
    capture === DEFAULT_CAPTURE &&
    !query;

  function reset() {
    setTab(DEFAULT_TAB);
    setIndustry("");
    setCity("");
    setCapture(DEFAULT_CAPTURE);
    setQuery("");
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Prospects
        </h1>
        <p className="text-sm text-neutral-500">
          {counts.all} total · {capturedCount} captured · {counts.new} to review ·{" "}
          {counts.hotlist} hotlisted · {counts.rejected} rejected
        </p>
      </header>

      <div className="mb-3">
        <FilterTabs
          tab={tab}
          counts={counts}
          onTab={setTab}
          query={query}
          onQuery={setQuery}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FacetSelect
          label="industries"
          value={industry}
          options={industryOptions}
          onChange={setIndustry}
        />
        <FacetSelect
          label="cities"
          value={city}
          options={cityOptions}
          onChange={setCity}
        />
        <FacetSelect
          label="capture status"
          allLabel="Any capture status"
          value={capture}
          options={captureOptions}
          onChange={setCapture}
        />
        <span className="text-sm text-neutral-500">{filtered.length} shown</span>
        {!isDefaultView && (
          <button
            onClick={reset}
            className="ml-auto text-sm text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white/60 py-20 text-center text-sm text-neutral-500">
          {items.length === 0 ? (
            <>
              No prospects yet. Drop a JSON file into{" "}
              <code className="rounded bg-neutral-100 px-1 py-0.5">inbox/</code> and run{" "}
              <code className="rounded bg-neutral-100 px-1 py-0.5">npm run capture</code>.
            </>
          ) : (
            <>No prospects match these filters.</>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProspectCard
              key={p.id}
              p={p}
              onSetStatus={onSetStatus}
              onRetry={onRetry}
            />
          ))}
        </div>
      )}
    </div>
  );
}
