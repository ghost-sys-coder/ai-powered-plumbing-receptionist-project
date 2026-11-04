import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  subscriptionStatusEnum,
  planEnum,
  customerStatusEnum,
} from "./enums";
import { organizations } from "./organizations";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // The agency that owns this customer. Every query from agency staff is
    // scoped by this column (lib/auth/staff.ts).
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    businessName: text("business_name").notNull(),
    ownerName: text("owner_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    timezone: text("timezone").notNull().default("America/New_York"),
    serviceArea: text("service_area"),
    // Prompt profile keys (lib/verticals, lib/regions). Plain text rather than
    // pg enums so adding an industry or country needs no migration; values are
    // validated in TS (isIndustryId / isCountryCode). Defaults match every
    // customer created before multi-industry support.
    industry: text("industry").notNull().default("plumbing"),
    country: text("country").notNull().default("US"),
    // Optional one-line self-description ("a dog grooming salon") that
    // replaces the industry default in the prompt. Required for "general".
    businessDescription: text("business_description"),
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
    index("customers_organization_id_idx").on(t.organizationId),
  ]
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
