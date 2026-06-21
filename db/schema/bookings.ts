import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { calls } from "./calls";
import { customers } from "./customers";

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    callId: uuid("call_id")
      .notNull()
      .unique()
      .references(() => calls.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    calendarEventId: text("calendar_event_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bookings_customer_scheduled_idx").on(t.customerId, t.scheduledAt)]
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
