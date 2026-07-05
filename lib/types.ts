// Plain, dependency-free types shared between server code and client components.
// Keeping these here (rather than importing from schema.ts) means client
// components never pull the better-sqlite3 / drizzle modules into their bundle.

export type ProspectStatus = "new" | "hotlist" | "rejected";
export type CaptureStatus = "pending" | "captured" | "failed";

/** A prospect shaped for the UI: serializable, with resolved image URLs. */
export interface ProspectDTO {
  id: number;
  name: string;
  website: string;
  domain: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  industry: string | null;
  estSize: string | null;
  saasNeeds: string[];
  notes: string | null;
  source: string | null;
  status: ProspectStatus;
  captureStatus: CaptureStatus;
  captureError: string | null;
  thumbUrl: string | null;
  screenshotUrl: string | null;
  capturedAt: number | null;
  createdAt: number;
}

/** Result of screenshotting one page, returned by the capture worker. */
export interface CaptureResult {
  url: string;
  thumbPath: string; // relative to data/screenshots, forward slashes
  screenshotPath: string; // relative to data/screenshots, forward slashes
  width: number;
  height: number;
}
