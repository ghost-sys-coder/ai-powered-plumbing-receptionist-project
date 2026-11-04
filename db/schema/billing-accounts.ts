import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";
import { customers } from "./customers";

// Who pays us. Direct customers (in the house agency) are billed one by one;
// an agency is billed once for all its clients and bills them itself.
// Exactly one of customerId / organizationId is set, matching `kind`.
//
// Mirrors the Stripe customer and subscription; Stripe is the source of truth
// and webhooks keep this row in sync (lib/billing/sync.ts).
export const billingAccounts = pgTable(
  "billing_accounts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // "direct" | "agency" — also the plan (lib/billing/plans.ts).
    kind: text("kind").notNull(),
    customerId: uuid("customer_id")
      .unique()
      .references(() => customers.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id")
      .unique()
      .references(() => organizations.id),
    stripeCustomerId: text("stripe_customer_id").notNull().unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    // Lowercase ISO currency of the subscription (usd, cad, gbp, aud).
    currency: text("currency"),
    // Stripe subscription status, or "none" before the first checkout.
    status: text("status").notNull().default("none"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    // Set while receptionists are switched off for non-payment.
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("billing_accounts_status_idx").on(t.status)]
);

export type BillingAccount = typeof billingAccounts.$inferSelect;
