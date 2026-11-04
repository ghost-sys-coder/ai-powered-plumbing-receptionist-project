import { pgTable, uuid, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers";
import { organizations } from "./organizations";

// Email → what the person is being invited to, consumed by the Clerk
// user.created webhook. A client invite links a customer; an agency invite
// links an organization.
export const pendingInvites = pgTable(
  "pending_invites",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    role: text("role").notNull().default("client"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "pending_invites_target_check",
      sql`(${t.role} = 'client' AND ${t.customerId} IS NOT NULL AND ${t.organizationId} IS NULL)
        OR (${t.role} = 'agency' AND ${t.organizationId} IS NOT NULL AND ${t.customerId} IS NULL)`
    ),
  ]
);

export type PendingInvite = typeof pendingInvites.$inferSelect;
