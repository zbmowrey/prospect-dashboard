import fs from "node:fs";
import path from "node:path";

const BASE = path.join(process.cwd(), "data", "screenshots");
const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const target = path.normalize(path.join(BASE, segments.join("/")));

  // Prevent path traversal outside the screenshots directory.
  if (!target.startsWith(BASE + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return new Response("Not found", { status: 404 });
  }

  const buf = fs.readFileSync(target);
  const type = TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream";
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": type, "Cache-Control": "no-store" },
  });
}
