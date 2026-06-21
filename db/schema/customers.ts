import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  subscriptionStatusEnum,
  planEnum,
  customerStatusEnum,
} from "./enums";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    businessName: text("business_name").notNull(),
    ownerName: text("owner_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    timezone: text("timezone").notNull().default("America/New_York"),
    serviceArea: text("service_area"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("trialing"),
    plan: planEnum("plan").notNull().default("standard"),
    status: customerStatusEnum("status").notNull().default("onboarding"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    churnedAt: timestamp("churned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("customers_stripe_customer_id_idx").on(t.stripeCustomerId),
    index("customers_status_idx").on(t.status),
  ]
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
