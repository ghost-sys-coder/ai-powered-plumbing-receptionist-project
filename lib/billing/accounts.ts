import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { billingAccounts, customers, organizations, type BillingAccount } from "@/db/schema";
import { STRIPE_APP_TAG, currencyForCountry, type BillingCurrency } from "./plans";
import { stripe } from "./stripe";

// Who is billed for a customer's receptionist:
//   direct — a customer of the house agency pays us themselves
//   agency — the customer's agency pays us for all its clients
//   exempt — pilot customers, never billed
export type BillingOwner =
  | { kind: "direct"; customerId: string; name: string; email: string; currency: BillingCurrency }
  | { kind: "agency"; organizationId: string; name: string }
  | { kind: "exempt"; customerId: string };

export async function billingOwnerForCustomer(customerId: string): Promise<BillingOwner | null> {
  const [row] = await db
    .select({
      businessName: customers.businessName,
      email: customers.email,
      country: customers.country,
      plan: customers.plan,
      organizationId: customers.organizationId,
      organizationName: organizations.name,
      isHouse: organizations.isHouse,
    })
    .from(customers)
    .innerJoin(organizations, eq(customers.organizationId, organizations.id))
    .where(eq(customers.id, customerId))
    .limit(1);
  if (!row) return null;
  if (row.plan === "pilot") return { kind: "exempt", customerId };
  if (row.isHouse) {
    return {
      kind: "direct",
      customerId,
      name: row.businessName,
      email: row.email,
      currency: currencyForCountry(row.country),
    };
  }
  return { kind: "agency", organizationId: row.organizationId, name: row.organizationName };
}

export async function agencyOwner(organizationId: string): Promise<BillingOwner | null> {
  const [org] = await db
    .select({ name: organizations.name, isHouse: organizations.isHouse })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  // The house agency isn't billed: its customers are, one by one.
  if (!org || org.isHouse) return null;
  return { kind: "agency", organizationId, name: org.name };
}

export async function findAccount(owner: BillingOwner): Promise<BillingAccount | null> {
  if (owner.kind === "exempt") return null;
  const where =
    owner.kind === "direct"
      ? eq(billingAccounts.customerId, owner.customerId)
      : eq(billingAccounts.organizationId, owner.organizationId);
  const [row] = await db.select().from(billingAccounts).where(where).limit(1);
  return row ?? null;
}

export async function findAccountByStripeCustomer(stripeCustomerId: string): Promise<BillingAccount | null> {
  const [row] = await db
    .select()
    .from(billingAccounts)
    .where(eq(billingAccounts.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return row ?? null;
}

// The owner's billing account, creating it (and its Stripe customer) on first
// use. `email` is where Stripe sends receipts; ignored once the account exists.
export async function ensureAccount(
  owner: Exclude<BillingOwner, { kind: "exempt" }>,
  email: string | null
): Promise<BillingAccount> {
  const existing = await findAccount(owner);
  if (existing) return existing;

  const ownerId = owner.kind === "direct" ? owner.customerId : owner.organizationId;
  const customer = await stripe().customers.create(
    {
      name: owner.name,
      email: email ?? undefined,
      metadata: {
        app: STRIPE_APP_TAG,
        kind: owner.kind,
        [owner.kind === "direct" ? "customer_id" : "organization_id"]: ownerId,
      },
    },
    // Two clicks at once reuse the same Stripe customer.
    { idempotencyKey: `billing-account-${owner.kind}-${ownerId}` }
  );

  await db
    .insert(billingAccounts)
    .values({
      kind: owner.kind,
      customerId: owner.kind === "direct" ? owner.customerId : null,
      organizationId: owner.kind === "agency" ? owner.organizationId : null,
      stripeCustomerId: customer.id,
    })
    .onConflictDoNothing();

  const created = await findAccount(owner);
  if (!created) throw new Error("Billing account could not be created");
  return created;
}
