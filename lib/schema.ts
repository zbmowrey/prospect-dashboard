import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const prospects = sqliteTable("prospects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  website: text("website").notNull(),
  domain: text("domain").notNull().unique(),
  city: text("city"),
  state: text("state"),
  phone: text("phone"),
  industry: text("industry"),
  estSize: text("est_size"),
  saasNeeds: text("saas_needs"), // JSON-encoded string[]
  notes: text("notes"),
  source: text("source"),
  status: text("status", { enum: ["new", "hotlist", "rejected"] })
    .notNull()
    .default("new"),
  captureStatus: text("capture_status", {
    enum: ["pending", "captured", "failed"],
  })
    .notNull()
    .default("pending"),
  captureError: text("capture_error"),
  createdAt: integer("created_at").notNull(), // epoch ms
  updatedAt: integer("updated_at").notNull(), // epoch ms
});

// One row per captured page. MVP writes a single `landing` row per prospect;
// multi-page capture later needs no schema change.
export const captures = sqliteTable("captures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  prospectId: integer("prospect_id")
    .notNull()
    .references(() => prospects.id, { onDelete: "cascade" }),
  pageLabel: text("page_label").notNull().default("landing"),
  url: text("url").notNull(),
  thumbPath: text("thumb_path").notNull(),
  screenshotPath: text("screenshot_path").notNull(),
  width: integer("width"),
  height: integer("height"),
  capturedAt: integer("captured_at").notNull(), // epoch ms
});

export type ProspectRow = typeof prospects.$inferSelect;
export type NewProspectRow = typeof prospects.$inferInsert;
export type CaptureRow = typeof captures.$inferSelect;
