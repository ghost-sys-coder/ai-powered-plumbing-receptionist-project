import type { BillingAccount } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { billingAccounts } from "@/db/schema";
import { ensureAccount, type BillingOwner } from "./accounts";
import {
  PLANS,
  STRIPE_APP_TAG,
  TRIAL_DAYS,
  isBillingCurrency,
  isInGoodStanding,
  lookupKey,
  needsCheckout,
  type BillingCurrency,
  type PlanId,
} from "./plans";
import { appOrigin, portalConfiguration, stripe } from "./stripe";

export class BillingStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingStateError";
  }
}

type PayingOwner = Exclude<BillingOwner, { kind: "exempt" }>;

// Stripe price ids for a plan: [monthly fee, metered minutes].
async function planPrices(plan: PlanId, currency: BillingCurrency): Promise<[string, string]> {
  const keys = [lookupKey(plan, "monthly", currency), lookupKey(plan, "minutes", currency)];
  const prices = await stripe().prices.list({ lookup_keys: keys, active: true, limit: 2 });
  const byKey = new Map(prices.data.map((p) => [p.lookup_key, p.id]));
  const monthly = byKey.get(keys[0]);
  const minutes = byKey.get(keys[1]);
  if (!monthly || !minutes) {
    throw new Error(`Prices ${keys.join(", ")} are missing — run scripts/stripe-setup.ts`);
  }
  return [monthly, minutes];
}

// A Stripe Checkout page that starts the owner's subscription: the monthly
// fee plus metered minutes, with a free trial the first time.
export async function createCheckoutUrl(opts: {
  owner: PayingOwner;
  plan: PlanId;
  email: string | null;
  currency: BillingCurrency;
  // Where to come back to, as a path on this site (e.g. "/dashboard/billing").
  returnPath: string;
}): Promise<string> {
  const plan = opts.plan;
  if (PLANS[plan].kind !== opts.owner.kind) {
    throw new BillingStateError("That plan isn't available for this account.");
  }
  const account = await ensureAccount(opts.owner, opts.email);
  if (!needsCheckout(account.status)) {
    throw new BillingStateError("This account already has a subscription. Use Manage billing instead.");
  }
  // Once a currency is set on a Stripe customer it can't change.
  const currency = (account.currency as BillingCurrency | null) ?? opts.currency;
  const [monthlyPrice, minutesPrice] = await planPrices(plan, currency);

  const origin = appOrigin();
  const back = `${origin}${opts.returnPath}`;
  const sep = back.includes("?") ? "&" : "?";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: account.stripeCustomerId,
    client_reference_id: account.id,
    line_items: [{ price: monthlyPrice, quantity: 1 }, { price: minutesPrice }],
    payment_method_collection: "always",
    allow_promotion_codes: true,
    subscription_data: {
      // Only a first subscription gets a trial; restarting after cancelling doesn't.
      ...(account.status === "none" ? { trial_period_days: TRIAL_DAYS } : {}),
      metadata: { app: STRIPE_APP_TAG, billing_account_id: account.id, plan },
    },
    metadata: { app: STRIPE_APP_TAG, billing_account_id: account.id },
    success_url: `${back}${sep}billing=success`,
    cancel_url: `${back}${sep}billing=cancelled`,
  });
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return session.url;
}

// Stripe's hosted portal: change card, see invoices, cancel.
export async function createPortalUrl(account: BillingAccount, returnPath: string): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${appOrigin()}${returnPath}`,
    configuration: await portalConfiguration(),
  });
  return session.url;
}

// Moves a live subscription to another plan of the same kind: both prices are
// swapped in place. The monthly fee is prorated; minutes already used this
// period are billed at the new plan's rates at the end of the period.
export async function changePlan(account: BillingAccount, plan: PlanId): Promise<void> {
  if (PLANS[plan].kind !== account.kind) {
    throw new BillingStateError("That plan isn't available for this account.");
  }
  if (!account.stripeSubscriptionId || !isInGoodStanding(account.status)) {
    throw new BillingStateError("There's no active subscription to change. Start one first.");
  }
  if (account.plan === plan) return;

  const sub = await stripe().subscriptions.retrieve(account.stripeSubscriptionId);
  const currency = isBillingCurrency(sub.currency) ? sub.currency : null;
  if (!currency) throw new BillingStateError(`Unsupported subscription currency ${sub.currency}.`);
  const [monthlyPrice, minutesPrice] = await planPrices(plan, currency);

  const items = sub.items.data.map((item) => ({
    id: item.id,
    price: item.price.recurring?.usage_type === "metered" ? minutesPrice : monthlyPrice,
  }));
  await stripe().subscriptions.update(sub.id, {
    items,
    proration_behavior: "create_prorations",
    metadata: { ...sub.metadata, plan },
  });
  // The webhook confirms this too; store it now so the page updates at once.
  await db.update(billingAccounts).set({ plan }).where(eq(billingAccounts.id, account.id));
}
