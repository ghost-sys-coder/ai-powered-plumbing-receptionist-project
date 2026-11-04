import type { BillingAccount } from "@/db/schema";
import { ensureAccount, planFor, type BillingOwner } from "./accounts";
import {
  STRIPE_APP_TAG,
  TRIAL_DAYS,
  lookupKey,
  needsCheckout,
  type BillingCurrency,
} from "./plans";
import { appOrigin, portalConfiguration, stripe } from "./stripe";

export class BillingStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingStateError";
  }
}

type PayingOwner = Exclude<BillingOwner, { kind: "exempt" }>;

// A Stripe Checkout page that starts the owner's subscription: the monthly
// fee plus metered minutes, with a free trial the first time.
export async function createCheckoutUrl(opts: {
  owner: PayingOwner;
  email: string | null;
  currency: BillingCurrency;
  // Where to come back to, as a path on this site (e.g. "/dashboard/billing").
  returnPath: string;
}): Promise<string> {
  const account = await ensureAccount(opts.owner, opts.email);
  if (!needsCheckout(account.status)) {
    throw new BillingStateError("This account already has a subscription. Use Manage billing instead.");
  }
  // Once a currency is set on a Stripe customer it can't change.
  const currency = (account.currency as BillingCurrency | null) ?? opts.currency;
  const plan = planFor(opts.owner);
  const keys = [lookupKey(plan, "monthly", currency), lookupKey(plan, "minutes", currency)];
  const prices = await stripe().prices.list({ lookup_keys: keys, active: true, limit: 2 });
  const byKey = new Map(prices.data.map((p) => [p.lookup_key, p.id]));
  if (!byKey.get(keys[0]) || !byKey.get(keys[1])) {
    throw new Error(`Prices ${keys.join(", ")} are missing — run scripts/stripe-setup.ts`);
  }

  const origin = appOrigin();
  const back = `${origin}${opts.returnPath}`;
  const sep = back.includes("?") ? "&" : "?";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: account.stripeCustomerId,
    client_reference_id: account.id,
    line_items: [{ price: byKey.get(keys[0]), quantity: 1 }, { price: byKey.get(keys[1]) }],
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
