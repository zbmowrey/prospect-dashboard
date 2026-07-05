import Link from "next/link";
import type { ProspectDTO, ProspectStatus } from "@/lib/types";
import StatusControls from "./StatusControls";

export default function ProspectCard({
  p,
  onSetStatus,
  onRetry,
}: {
  p: ProspectDTO;
  onSetStatus: (id: number, s: ProspectStatus) => void;
  onRetry: (id: number) => void;
}) {
  const location = [p.city, p.state].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3">
        <h3 className="truncate font-semibold text-neutral-900" title={p.name}>
          {p.name}
        </h3>
        {location && (
          <span className="whitespace-nowrap text-sm text-neutral-500">{location}</span>
        )}
      </div>

      <div className="relative aspect-[16/10] border-y border-neutral-100 bg-neutral-100">
        {p.captureStatus === "captured" && p.thumbUrl ? (
          <Link
            href={`/prospect/${p.id}`}
            className="block h-full w-full"
            title="View capture & details"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumbUrl}
              alt={`${p.name} website`}
              className="h-full w-full object-cover object-top"
            />
          </Link>
        ) : p.captureStatus === "pending" ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-neutral-400">
            <span className="h-3 w-3 animate-pulse rounded-full bg-neutral-300" />
            Capturing…
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm">
            <span className="text-red-500">Capture failed</span>
            <button
              onClick={() => onRetry(p.id)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <a
          href={p.website}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm text-blue-600 hover:underline"
          title={p.website}
        >
          {p.domain}
        </a>

        {(p.industry || p.estSize) && (
          <div className="flex flex-wrap gap-1.5">
            {p.industry && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {p.industry}
              </span>
            )}
            {p.estSize && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {p.estSize} ppl
              </span>
            )}
          </div>
        )}

        <div className="mt-auto">
          <StatusControls status={p.status} onSetStatus={(s) => onSetStatus(p.id, s)} />
        </div>
      </div>
    </div>
  );
}
