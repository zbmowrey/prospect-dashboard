# Prospect Dashboard

A local tool for triaging small-business websites as sales prospects. Drop a JSON
file of companies into a folder; a headless browser screenshots each site
automatically. Then review them as a card grid — thumbnail, name, city/state, and
a clickable domain — and **Hotlist** or **Reject** each one with a click.

Built with Next.js 16 (App Router) + Playwright + SQLite. Runs entirely on your
machine, no accounts, no cloud.

## How it works

```
  inbox/*.json ─►  capture worker  ─►  data/screenshots/  ┐
   (you drop)       (Playwright)          + data/app.db ───┼─►  Next.js dashboard
                                                           ┘      (cards, hotlist/reject)
```

Two processes share one SQLite file:

- **`npm run capture`** — watches `inbox/`, ingests dropped files, screenshots
  each website, and writes rows + images. Keep it running.
- **`npm run dev`** — the dashboard at http://localhost:3000.

## Setup

```bash
npm install
npx playwright install chromium   # one-time: fetch the headless browser
npm run db:migrate                 # create data/app.db (also auto-runs on first start)
```

## Run

In two terminals:

```bash
npm run capture    # terminal 1 — the screenshot worker (leave running)
npm run dev        # terminal 2 — the dashboard
```

Then add prospects by dropping a JSON file into `inbox/`:

```bash
cp samples/prospects.example.json inbox/
```

The worker captures each site within seconds; thumbnails appear on the dashboard
automatically (it polls while captures are pending). You can also capture a single
file without the watcher:

```bash
npm run capture -- ./some-file.json
```

## Task shortcuts (`just`)

Install once with `brew install just`, then:

```bash
just start                       # run worker + dashboard together (Ctrl-C stops both)
just add https://acme.com        # queue one site (name auto-derived from the domain)
just add https://acme.com Acme Plumbing Co   # ...or give it a name (multiple words ok)
just import samples/sites.example.txt        # bulk-queue from a list file
just queue                       # show capture states + anything still waiting
just stop                        # stop the dev server + worker
```

Run `just` on its own to list every recipe.

## Populating the queue

Three ways to add sites, all funnel into `inbox/` → the worker captures them:

1. **`just add <url> [name…]`** — quickest for one site.
2. **`just import <file>`** — bulk. One site per line: `url[, name, city, state, industry]`
   (only the URL is required; `#` comments allowed). See `samples/sites.example.txt`.
3. **Drop a JSON file** into `inbox/` yourself (see the format below).

Sites are de-duplicated by domain. Note: re-adding an existing domain **updates** its
row — including overwriting the name — so bulk-importing a bare URL for a company you
already named will replace that name with one derived from the domain.

## Input format

A dropped file is one prospect object or an array of them. `name` and `website`
are required; everything else is optional. Prospects are de-duplicated by domain,
so re-dropping a file updates the existing entry.

```json
[
  {
    "name": "XYZ Enterprises",
    "website": "https://xyzenterprises.com",
    "city": "Spring Hill",
    "state": "FL",
    "phone": "352-555-0100",
    "industry": "HVAC",
    "est_size": "1-10",
    "saas_needs": ["online booking", "review capture", "local SEO"],
    "source": "google maps — spring hill hvac"
  }
]
```

See `samples/prospects.example.json` for a working example.

## Reviewing

- **Active** tab (default) shows new + hotlisted prospects; rejected ones are hidden.
- **★ Hotlist** flags a promising lead; **✕ Reject** removes it from Active.
- **Rejected** tab lists everything you passed on, with **Restore** to bring one back.
- Click a thumbnail for the full-page screenshot and all captured details.
- Click the domain to open the live site in a new tab.
- If a capture fails (bad URL, timeout), the card shows **Retry**.

## Data & backup

Everything lives in `data/` — `app.db` (SQLite) and `screenshots/`. Back it up by
copying that folder. Both `data/` and dropped payloads are git-ignored.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dashboard (dev server) |
| `npm run capture` | Screenshot worker (folder watcher) |
| `npm run capture -- <file>` | Capture a single file, then exit |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:generate` | Generate a migration after editing `lib/schema.ts` |
| `npm run db:studio` | Browse the database in Drizzle Studio |
| `npm run seed` | Insert a couple of sample rows |

## Roadmap (schema is already ready)

- Multi-page capture (the `captures` table takes one row per page).
- Deploy for a team: add auth + move `data/` to a shared volume.
