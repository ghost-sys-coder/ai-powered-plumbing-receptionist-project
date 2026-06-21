import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { userRoleEnum } from "./enums";
import { organizations } from "./organizations";
import { customers } from "./customers";

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clerkId: text("clerk_id").notNull().unique(),
    email: text("email").notNull(),
    name: text("name"),
    role: userRoleEnum("role").notNull().default("client"),
    organizationId: uuid("organization_id").references(() => organizations.id),
    customerId: uuid("customer_id").references(() => customers.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("users_clerk_id_idx").on(t.clerkId),
    index("users_customer_id_idx").on(t.customerId),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
