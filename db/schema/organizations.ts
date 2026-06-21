import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const organizations = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
