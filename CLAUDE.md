@AGENTS.md

# Prospect Dashboard

A **local** tool for triaging small-business websites as sales prospects. Drop a
JSON file (or use `just add`) → a headless browser screenshots each site → review
them as a card grid and Hotlist / Reject each one. All local, no auth, no cloud.

Stack: **Next.js 16 (App Router) · Playwright · sharp · SQLite (Drizzle ORM +
better-sqlite3) · Tailwind v4**, all TypeScript.

## Architecture

Two Node processes share one SQLite file (`data/app.db`):

```
  inbox/*.json ─►  capture worker  ─►  data/screenshots/  ┐
   (you drop)       (Playwright)          + data/app.db ───┼─►  Next.js dashboard
                                                           ┘      (cards, hotlist/reject)
```

- **Capture worker** (`worker/`, run via `tsx`) — watches `inbox/`, ingests dropped
  files, screenshots each site, writes rows + images. Also polls the DB every 5s so
  UI-triggered "Retry" (which sets `capture_status='pending'`) gets picked up.
- **Dashboard** (`app/`, Next.js) — reads the DB, renders the grid, streams
  screenshots, handles status changes.

Decoupled entirely through SQLite (WAL mode → concurrent reader + writer).

## Commands

Prefer `just` (install once: `brew install just`). Run `just` to list all recipes.

| Command | Purpose |
| --- | --- |
| `just start` | **Run everything**: capture worker + dashboard (Ctrl-C stops both) |
| `just dashboard` / `just worker` | Run one process alone |
| `just add <url> [name…]` | Queue one site (name optional, may be multiple words) |
| `just import <file>` | Bulk-queue from a list (`url[, name, city, state, industry]` per line) |
| `just queue` | Show capture states + files still waiting in `inbox/` |
| `just capture <file>` | One-shot: capture a specific JSON file, then exit |
| `just db` / `just migrate` / `just seed` / `just stop` | Drizzle Studio / migrations / demo rows / kill processes |

Underlying npm scripts (what the recipes call): `dev`, `build`, `start`, `capture`,
`seed`, `db:generate`, `db:migrate`, `db:studio`. One-time setup:
`npm install && npx playwright install chromium`.

**The dev server uses port 3001** — port 3000 is occupied by Docker on this machine,
so Next falls back automatically.

## Populating the queue

The "queue" is `inbox/` → rows with `capture_status='pending'` → `captured`. Three
ways in, all funnel through the same validation + dedup pipeline:

1. `just add <url> [name…]` — quickest, one site.
2. `just import <file>` — bulk (see `samples/sites.example.txt`).
3. Drop a JSON file into `inbox/` directly (see `samples/prospects.example.json`).

Input files are one prospect object or an array; `name` + `website` required, the
rest optional. **De-duplicated by domain** — re-adding a domain *updates* the row
(including overwriting `name`), so bulk-importing a bare URL for a company you
already named replaces that name with a domain-derived one.

## Directory map

| Path | Contents |
| --- | --- |
| `app/page.tsx` | Dashboard grid (server component → `ProspectBoard` client component) |
| `app/prospect/[id]/page.tsx` | Detail view (full-page capture + metadata) |
| `app/api/prospects/route.ts` | `GET` list |
| `app/api/prospects/[id]/route.ts` | `PATCH` status / requeue capture |
| `app/api/screenshots/[...path]/route.ts` | Streams images from `data/screenshots` (path-traversal guarded) |
| `app/components/` | `ProspectBoard` (client), `ProspectCard`, `FilterTabs`, `StatusControls` |
| `lib/schema.ts` | Drizzle tables: `prospects`, `captures` |
| `lib/db.ts` | better-sqlite3 + drizzle singleton; WAL; auto-migrates on connect |
| `lib/prospects.ts` | All queries/mutations (list, setStatus, upsertFromInput, recordCapture…) |
| `lib/domain.ts` `lib/validation.ts` `lib/types.ts` | URL/domain normalize, Zod input schema, shared DTO types |
| `worker/browser.ts` | Playwright launch + screenshot + sharp thumbnail (+ auto-scroll) |
| `worker/capture.ts` | Watcher + ingest + capture loop |
| `scripts/enqueue.ts` | `just add` / `just import` backend — writes inbox files |
| `samples/` | Templates (`prospects.example.json`, `sites.example.txt`) |
| `inbox/` | Drop zone (+ `processed/`, `failed/`); git-ignored payloads |
| `data/` | `app.db` + `screenshots/` — git-ignored; back up by copying this folder |
| `drizzle/` | Generated migrations |

## Conventions & gotchas

**This is Next.js 16** — read `node_modules/next/dist/docs/` before using framework
APIs (see `AGENTS.md`). Notably `params`/`searchParams` are **Promises**: type them
`Promise<{…}>` and `await` them in pages and route handlers.

- **Import boundaries.** `lib/db`, `lib/schema`, `lib/prospects` are server-only
  (native better-sqlite3). Never import them into a client component — client
  components import **types only** from `@/lib/types`. `serverExternalPackages:
  ['better-sqlite3']` in `next.config.ts` keeps the native module out of bundles.
- **Path aliases.** `@/…` works only in Next-compiled code (`app/`). `lib/` and
  `worker/` use **relative imports** because the worker runs under `tsx`, which
  doesn't resolve tsconfig path aliases.
- **SQLite is synchronous.** Drizzle queries use `.all()` / `.get()` / `.run()` — no
  `await`. Pages/handlers can still be `async` for `params`.
- **Migrations.** After editing `lib/schema.ts`, run `npm run db:generate`; the new
  migration auto-applies on the next process start (`lib/db.ts`). `just migrate`
  applies without regenerating.
- **Timestamps** are epoch-ms integers set in code (`Date.now()`), not DB defaults.
- **Worker code isn't hot-reloaded** — after editing `worker/*`, restart it
  (`just worker`). The dashboard (Next) does hot-reload.
- **Dependency quirks:** chokidar v5 has no glob support (watch the dir, filter in
  the handler); Zod v4 (avoid `.passthrough()`); `p-limit`/`chokidar` are ESM-only
  (fine under `tsx`).
- **`captures`** holds one row per page (multi-page ready); MVP writes only the
  `landing` row per prospect.

## Verifying changes end-to-end

1. `just start` (worker + dashboard).
2. `just add <some-url>` → watch the worker log capture it → open http://localhost:3001.
3. Confirm the card shows a thumbnail, Hotlist/Reject persist, and the domain link opens the live site.
4. `just queue` to see capture-state counts. Inspect data with `just db`.
