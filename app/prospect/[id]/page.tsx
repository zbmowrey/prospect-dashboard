import Link from "next/link";
import { notFound } from "next/navigation";
import { getProspectForUi } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export default async function ProspectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = getProspectForUi(Number(id));
  if (!p) notFound();

  const location = [p.city, p.state].filter(Boolean).join(", ");
  const meta: [string, string | null][] = [
    ["Location", location || null],
    ["Phone", p.phone],
    ["Industry", p.industry],
    ["Est. size", p.estSize ? `${p.estSize} people` : null],
    ["Source", p.source],
    ["Status", p.status],
  ];

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Back to prospects
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold text-neutral-900">{p.name}</h1>
        <a
          href={p.website}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Open site ↗
        </a>
      </div>
      <a
        href={p.website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        {p.domain}
      </a>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {p.screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.screenshotUrl} alt={`${p.name} full page`} className="w-full" />
          ) : (
            <div className="py-24 text-center text-sm text-neutral-400">
              {p.captureStatus === "pending"
                ? "Capturing…"
                : p.captureError
                  ? `Capture failed: ${p.captureError}`
                  : "No screenshot yet."}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <dl className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
            {meta
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-1">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="text-right font-medium text-neutral-800">{v}</dd>
                </div>
              ))}
          </dl>

          {p.saasNeeds.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Likely SaaS needs
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {p.saasNeeds.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {p.notes && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Notes
              </h2>
              {p.notes}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
