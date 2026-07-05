import fs from "node:fs";
import path from "node:path";
import { normalizeDomain, normalizeUrl } from "../lib/domain";

// Writes a well-formed prospect file into inbox/ so the capture worker picks it
// up. This is the ergonomic way to "populate the queue" without hand-editing JSON.
//
// Usage:
//   tsx scripts/enqueue.ts <url> [--name ".."] [--city ".."] [--state ".."] [--industry ".."]
//   tsx scripts/enqueue.ts --file <path>   # one "url[, name, city, state, industry]" per line

const INBOX = path.join(process.cwd(), "inbox");

interface Prospect {
  name: string;
  website: string;
  city?: string;
  state?: string;
  industry?: string;
  source: string;
}

/** Turn a domain into a readable fallback name: blue-ridge.com → "Blue Ridge". */
function deriveName(website: string): string {
  const label = normalizeDomain(website).split(".")[0] ?? "";
  const words = label.split(/[-_]/).filter(Boolean);
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  return words.length ? words.map(cap).join(" ") : label;
}

function toProspect(website: string, extra: Partial<Prospect> = {}): Prospect {
  const url = normalizeUrl(website); // validates + normalizes; throws on garbage
  const name = extra.name?.trim() ? extra.name.trim() : deriveName(url);
  return {
    name,
    website: url,
    ...(extra.city?.trim() ? { city: extra.city.trim() } : {}),
    ...(extra.state?.trim() ? { state: extra.state.trim() } : {}),
    ...(extra.industry?.trim() ? { industry: extra.industry.trim() } : {}),
    source: extra.source ?? "enqueue",
  };
}

/** Parse one line of an import file: `url[, name[, city[, state[, industry]]]]`. */
function parseFileLine(line: string): Prospect | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const [website, name, city, state, industry] = trimmed
    .split(",")
    .map((s) => s.trim());
  if (!website) return null;
  try {
    return toProspect(website, { name, city, state, industry, source: "import" });
  } catch {
    console.warn(`  ! skipped invalid URL: ${website}`);
    return null;
  }
}

function writeInbox(prospects: Prospect[]): string {
  fs.mkdirSync(INBOX, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(INBOX, `enqueue-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(prospects, null, 2) + "\n");
  return file;
}

function usage(): never {
  console.error(
    [
      "Populate the scrape queue.",
      "",
      "  enqueue <url> [--name ..] [--city ..] [--state ..] [--industry ..]",
      "  enqueue --file <path>   # one 'url[, name, city, state, industry]' per line",
    ].join("\n"),
  );
  process.exit(1);
}

function main(): void {
  const argv = process.argv.slice(2);
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) flags[a.slice(2)] = argv[++i] ?? "";
    else positional.push(a);
  }

  let prospects: Prospect[];

  if (flags.file) {
    const raw = fs.readFileSync(path.resolve(flags.file), "utf8");
    prospects = raw
      .split(/\r?\n/)
      .map(parseFileLine)
      .filter((p): p is Prospect => p !== null);
    if (prospects.length === 0) {
      console.error(`No valid sites found in ${flags.file}`);
      process.exit(1);
    }
  } else {
    const website = positional[0] ?? flags.url;
    if (!website) usage();
    try {
      prospects = [
        toProspect(website, {
          name: flags.name,
          city: flags.city,
          state: flags.state,
          industry: flags.industry,
        }),
      ];
    } catch {
      console.error(`Not a valid URL: ${website}`);
      process.exit(1);
    }
  }

  const file = writeInbox(prospects);
  console.log(`Queued ${prospects.length} site(s) → ${path.relative(process.cwd(), file)}`);
  for (const p of prospects) console.log(`  • ${p.name} — ${p.website}`);
  console.log("The capture worker will pick these up (start it with `just worker` if needed).");
}

main();
