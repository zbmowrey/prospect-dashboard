import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { prospects, captures } from "./schema";
import { normalizeDomain, normalizeUrl } from "./domain";
import type { ProspectInput } from "./validation";
import type { CaptureResult, ProspectDTO, ProspectStatus } from "./types";
import type { ProspectRow } from "./schema";

const LANDING = "landing";

const now = () => Date.now();

function safeParseArray(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

type CaptureCols = {
  thumbPath: string | null;
  screenshotPath: string | null;
  capturedAt: number | null;
};

function toDTO(p: ProspectRow, cap: CaptureCols): ProspectDTO {
  return {
    id: p.id,
    name: p.name,
    website: p.website,
    domain: p.domain,
    city: p.city,
    state: p.state,
    phone: p.phone,
    industry: p.industry,
    estSize: p.estSize,
    saasNeeds: safeParseArray(p.saasNeeds),
    notes: p.notes,
    source: p.source,
    status: p.status,
    captureStatus: p.captureStatus,
    captureError: p.captureError,
    thumbUrl: cap.thumbPath ? `/api/screenshots/${encodeURI(cap.thumbPath)}` : null,
    screenshotUrl: cap.screenshotPath
      ? `/api/screenshots/${encodeURI(cap.screenshotPath)}`
      : null,
    capturedAt: cap.capturedAt,
    createdAt: p.createdAt,
  };
}

const uiSelect = {
  p: prospects,
  thumbPath: captures.thumbPath,
  screenshotPath: captures.screenshotPath,
  capturedAt: captures.capturedAt,
} as const;

const landingJoin = and(
  eq(captures.prospectId, prospects.id),
  eq(captures.pageLabel, LANDING),
);

export function listProspectsForUi(): ProspectDTO[] {
  const rows = db
    .select(uiSelect)
    .from(prospects)
    .leftJoin(captures, landingJoin)
    .orderBy(desc(prospects.createdAt))
    .all();
  return rows.map((r) =>
    toDTO(r.p, {
      thumbPath: r.thumbPath,
      screenshotPath: r.screenshotPath,
      capturedAt: r.capturedAt,
    }),
  );
}

export function getProspectForUi(id: number): ProspectDTO | null {
  const r = db
    .select(uiSelect)
    .from(prospects)
    .leftJoin(captures, landingJoin)
    .where(eq(prospects.id, id))
    .get();
  if (!r) return null;
  return toDTO(r.p, {
    thumbPath: r.thumbPath,
    screenshotPath: r.screenshotPath,
    capturedAt: r.capturedAt,
  });
}

export function setStatus(id: number, status: ProspectStatus): ProspectDTO | null {
  db.update(prospects)
    .set({ status, updatedAt: now() })
    .where(eq(prospects.id, id))
    .run();
  return getProspectForUi(id);
}

export function requeueCapture(id: number): ProspectDTO | null {
  db.update(prospects)
    .set({ captureStatus: "pending", captureError: null, updatedAt: now() })
    .where(eq(prospects.id, id))
    .run();
  return getProspectForUi(id);
}

/** Insert a new prospect or update an existing one (matched by domain). */
export function upsertFromInput(input: ProspectInput): number {
  const domain = normalizeDomain(input.website);
  const website = normalizeUrl(input.website);
  const saas = input.saasNeeds ?? input.saas_needs;
  const estSize = input.estSize ?? input.est_size ?? null;
  const ts = now();

  const existing = db
    .select()
    .from(prospects)
    .where(eq(prospects.domain, domain))
    .get();

  if (existing) {
    const wasFailed = existing.captureStatus === "failed";
    db.update(prospects)
      .set({
        name: input.name,
        website,
        city: input.city ?? existing.city,
        state: input.state ?? existing.state,
        phone: input.phone ?? existing.phone,
        industry: input.industry ?? existing.industry,
        estSize: estSize ?? existing.estSize,
        saasNeeds: saas ? JSON.stringify(saas) : existing.saasNeeds,
        notes: input.notes ?? existing.notes,
        source: input.source ?? existing.source,
        // Re-drop of a previously failed capture retries it.
        captureStatus: wasFailed ? "pending" : existing.captureStatus,
        captureError: wasFailed ? null : existing.captureError,
        updatedAt: ts,
      })
      .where(eq(prospects.id, existing.id))
      .run();
    return existing.id;
  }

  const inserted = db
    .insert(prospects)
    .values({
      name: input.name,
      website,
      domain,
      city: input.city ?? null,
      state: input.state ?? null,
      phone: input.phone ?? null,
      industry: input.industry ?? null,
      estSize,
      saasNeeds: saas ? JSON.stringify(saas) : null,
      notes: input.notes ?? null,
      source: input.source ?? null,
      status: "new",
      captureStatus: "pending",
      createdAt: ts,
      updatedAt: ts,
    })
    .returning({ id: prospects.id })
    .get();
  return inserted.id;
}

/** Prospects awaiting a screenshot. */
export function prospectsNeedingCapture(): ProspectRow[] {
  return db
    .select()
    .from(prospects)
    .where(eq(prospects.captureStatus, "pending"))
    .all();
}

/** Store a successful landing-page capture (replacing any prior one). */
export function recordCapture(prospectId: number, res: CaptureResult): void {
  const ts = now();
  db.delete(captures)
    .where(and(eq(captures.prospectId, prospectId), eq(captures.pageLabel, LANDING)))
    .run();
  db.insert(captures)
    .values({
      prospectId,
      pageLabel: LANDING,
      url: res.url,
      thumbPath: res.thumbPath,
      screenshotPath: res.screenshotPath,
      width: res.width,
      height: res.height,
      capturedAt: ts,
    })
    .run();
  db.update(prospects)
    .set({ captureStatus: "captured", captureError: null, updatedAt: ts })
    .where(eq(prospects.id, prospectId))
    .run();
}

export function markCaptureFailed(prospectId: number, error: string): void {
  db.update(prospects)
    .set({ captureStatus: "failed", captureError: error, updatedAt: now() })
    .where(eq(prospects.id, prospectId))
    .run();
}
