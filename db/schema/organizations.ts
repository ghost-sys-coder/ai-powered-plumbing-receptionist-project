import { pgTable, uuid, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// An agency: the tenant that owns customers. Agencies resell receptionists to
// their clients; businesses that buy directly belong to the single "house"
// agency, so direct and reseller sales run through the same code.
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    isHouse: boolean("is_house").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // At most one house agency.
  (t) => [uniqueIndex("organizations_single_house_idx").on(t.isHouse).where(sql`${t.isHouse}`)]
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
