import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers";

// A business's own Google account, connected with one click (OAuth). When a
// customer has a connection, calendar reads and bookings use it; otherwise the
// platform service account is used (the original share-the-calendar flow).
export const calendarConnections = pgTable("calendar_connections", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("google"),
  // Shown in the UI ("Connected as …").
  accountEmail: text("account_email"),
  // AES-256-GCM ciphertext (lib/crypto/secret-box.ts). Never stored or logged
  // in plain text.
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  scope: text("scope"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type CalendarConnection = typeof calendarConnections.$inferSelect;
