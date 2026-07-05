import { chromium, type Browser, type Page } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import type { CaptureResult } from "../lib/types";

const SCREENSHOTS_DIR = path.join(process.cwd(), "data", "screenshots");
const VIEWPORT = { width: 1440, height: 900 };
const NAV_TIMEOUT = 30_000;
const SETTLE_MS = 1_500;
const THUMB_WIDTH = 640;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true });
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

/**
 * Scroll the page top-to-bottom to trigger lazy-loaded images and scroll-in
 * animations, so the subsequent full-page screenshot captures the whole page.
 * Capped so infinite-scroll pages can't loop forever.
 */
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const MAX = 40_000; // px safety cap
    await new Promise<void>((resolve) => {
      let total = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        total += distance;
        const atBottom =
          total >= document.body.scrollHeight - window.innerHeight;
        if (atBottom || total > MAX) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Screenshot a site's landing page. Writes a full-page PNG (for the detail view)
 * and a downscaled WebP thumbnail (for the card grid). Reuses one browser across
 * calls; every site is treated as hostile (nav timeout, isolated context).
 */
export async function captureSite(
  domain: string,
  url: string,
): Promise<CaptureResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    userAgent: USER_AGENT,
    // Capture sites even when they have expired/invalid TLS certs — those are
    // exactly the neglected sites worth prospecting.
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "load", timeout: NAV_TIMEOUT });
    await page.waitForTimeout(SETTLE_MS);

    const dir = path.join(SCREENSHOTS_DIR, domain);
    fs.mkdirSync(dir, { recursive: true });

    const fullAbs = path.join(dir, "landing-full.png");
    const thumbAbs = path.join(dir, "landing-thumb.webp");

    // Thumbnail first, while still scrolled to the top (clean above-the-fold shot).
    const viewportBuf = await page.screenshot({ fullPage: false, type: "png" });

    // Then reveal the whole page before the full-page capture.
    await autoScroll(page);
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({ path: fullAbs, fullPage: true, type: "png" });
    const info = await sharp(viewportBuf)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(thumbAbs);

    return {
      url,
      thumbPath: `${domain}/landing-thumb.webp`,
      screenshotPath: `${domain}/landing-full.png`,
      width: info.width ?? VIEWPORT.width,
      height: info.height ?? VIEWPORT.height,
    };
  } finally {
    await context.close();
  }
}
