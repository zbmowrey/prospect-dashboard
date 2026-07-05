import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

fs.mkdirSync(DATA_DIR, { recursive: true });

// Reuse a single connection across Next dev HMR reloads and within a process.
type Globals = typeof globalThis & {
  __sqlite?: Database.Database;
  __migrated?: boolean;
};
const g = globalThis as Globals;

const sqlite = g.__sqlite ?? new Database(DB_PATH);
if (!g.__sqlite) {
  sqlite.pragma("journal_mode = WAL"); // concurrent reader (app) + writer (worker)
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000"); // wait rather than throw SQLITE_BUSY
  g.__sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });

// Apply any pending migrations once per process. Idempotent; safe when both the
// worker and the Next server start independently.
if (!g.__migrated) {
  try {
    if (fs.existsSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"))) {
      migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    }
    g.__migrated = true;
  } catch (err) {
    console.error("[db] migration error:", err);
  }
}
