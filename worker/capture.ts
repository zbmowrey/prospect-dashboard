import fs from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import pLimit from "p-limit";
import { prospectFileSchema } from "../lib/validation";
import {
  markCaptureFailed,
  prospectsNeedingCapture,
  recordCapture,
  upsertFromInput,
} from "../lib/prospects";
import { captureSite, closeBrowser } from "./browser";

const INBOX = path.join(process.cwd(), "inbox");
const PROCESSED = path.join(INBOX, "processed");
const FAILED = path.join(INBOX, "failed");
const POLL_MS = 5_000;
const CONCURRENCY = 3;

for (const d of [INBOX, PROCESSED, FAILED]) fs.mkdirSync(d, { recursive: true });

const limit = pLimit(CONCURRENCY);
let processing = false;

function moveFile(file: string, destDir: string): void {
  const dest = path.join(destDir, path.basename(file));
  try {
    fs.renameSync(file, dest);
  } catch {
    try {
      fs.copyFileSync(file, dest);
      fs.unlinkSync(file);
    } catch (err) {
      console.error("[worker] could not move", file, err);
    }
  }
}

/** Parse one dropped file, upsert its prospects, then file it away. */
function ingestFile(file: string): void {
  const base = path.basename(file);
  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const parsed = prospectFileSchema.parse(json);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) upsertFromInput(item);
    console.log(`[ingest] ${base}: ${items.length} prospect(s) queued`);
    moveFile(file, PROCESSED);
  } catch (err) {
    console.error(`[ingest] ${base} failed:`, err instanceof Error ? err.message : err);
    moveFile(file, FAILED);
  }
}

/** Screenshot every pending prospect. Guarded so passes never overlap. */
async function processPending(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    const pending = prospectsNeedingCapture();
    if (pending.length === 0) return;
    console.log(`[capture] ${pending.length} pending`);
    await Promise.all(
      pending.map((p) =>
        limit(async () => {
          try {
            console.log(`[capture] → ${p.domain}`);
            const res = await captureSite(p.domain, p.website);
            recordCapture(p.id, res);
            console.log(`[capture] ✓ ${p.domain}`);
          } catch (err) {
            const msg = (err instanceof Error ? err.message : String(err)).slice(0, 500);
            markCaptureFailed(p.id, msg);
            console.warn(`[capture] ✗ ${p.domain}: ${msg}`);
          }
        }),
      ),
    );
  } finally {
    processing = false;
  }
}

async function main(): Promise<void> {
  // One-shot mode: `npm run capture -- ./some-file.json`
  const arg = process.argv[2];
  if (arg) {
    ingestFile(path.resolve(arg));
    await processPending();
    await closeBrowser();
    process.exit(0);
  }

  // Backfill anything already sitting in the inbox.
  for (const f of fs.readdirSync(INBOX)) {
    if (f.endsWith(".json")) ingestFile(path.join(INBOX, f));
  }
  await processPending();

  // Watch for new drops (chokidar v5 has no glob support — watch the dir, filter here).
  const watcher = chokidar.watch(INBOX, {
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
  });
  watcher.on("add", async (file) => {
    if (!file.endsWith(".json")) return;
    ingestFile(file);
    await processPending();
  });

  // Also poll so UI-triggered retries (which set status back to pending) get picked up.
  const timer = setInterval(() => void processPending(), POLL_MS);

  const shutdown = async () => {
    clearInterval(timer);
    await watcher.close();
    await closeBrowser();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(
    `[worker] watching ${path.relative(process.cwd(), INBOX)}/ for *.json — ` +
      `drop files to capture. Polling pending every ${POLL_MS / 1000}s.`,
  );
}

void main();
