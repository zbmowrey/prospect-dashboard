import type { ProspectStatus } from "@/lib/types";

export default function StatusControls({
  status,
  onSetStatus,
}: {
  status: ProspectStatus;
  onSetStatus: (s: ProspectStatus) => void;
}) {
  if (status === "rejected") {
    return (
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSetStatus("new")}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Restore
        </button>
      </div>
    );
  }

  const isHot = status === "hotlist";
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={() => onSetStatus(isHot ? "new" : "hotlist")}
        aria-pressed={isHot}
        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isHot
            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
            : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        {isHot ? "★ Hotlisted" : "☆ Hotlist"}
      </button>
      <button
        onClick={() => onSetStatus("rejected")}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        ✕ Reject
      </button>
    </div>
  );
}
