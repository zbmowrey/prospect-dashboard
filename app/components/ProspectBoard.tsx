"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProspectDTO, ProspectStatus } from "@/lib/types";
import ProspectCard from "./ProspectCard";
import FilterTabs, { type TabKey } from "./FilterTabs";

export default function ProspectBoard({
  initialProspects,
}: {
  initialProspects: ProspectDTO[];
}) {
  const [items, setItems] = useState<ProspectDTO[]>(initialProspects);
  const [tab, setTab] = useState<TabKey>("active");
  const [query, setQuery] = useState("");

  // While any capture is pending, poll the server so freshly-shot thumbnails
  // appear without a manual refresh. Stops once nothing is pending.
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
      active: items.filter((p) => p.status !== "rejected").length,
      hotlist: items.filter((p) => p.status === "hotlist").length,
      rejected: items.filter((p) => p.status === "rejected").length,
      all: items.length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      const inTab =
        tab === "all"
          ? true
          : tab === "active"
            ? p.status !== "rejected"
            : p.status === tab;
      if (!inTab) return false;
      if (!q) return true;
      return [p.name, p.domain, p.city, p.state, p.industry]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [items, tab, query]);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Prospects
        </h1>
        <p className="text-sm text-neutral-500">
          {counts.active} active · {counts.hotlist} hotlisted · {counts.rejected}{" "}
          rejected
        </p>
      </header>

      <div className="mb-5">
        <FilterTabs
          tab={tab}
          counts={counts}
          onTab={setTab}
          query={query}
          onQuery={setQuery}
        />
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
            <>No prospects match this view.</>
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
