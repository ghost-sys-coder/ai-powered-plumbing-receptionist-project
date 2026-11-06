import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

// Platform-wide switches that platform admins flip from /admin/settings
// (see lib/services/platform-settings.ts for the keys and their defaults).
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  // Clerk id of the admin who last changed it.
  updatedBy: text("updated_by"),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;
