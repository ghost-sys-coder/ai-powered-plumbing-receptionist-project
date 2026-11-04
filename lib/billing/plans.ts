import type { CountryCode } from "@/lib/regions";

// What we charge. Amounts are in the currency's smallest unit (cents/pence).
// Each currency is priced on its own (rounded local prices, not converted).
//
// Changing a price: bump PRICE_VERSION, edit the amounts, run
// `npx tsx scripts/stripe-setup.ts`. New prices get new lookup keys; existing
// subscribers stay on their old price until moved.

export const PRICE_VERSION = "v1";

export const BILLING_CURRENCIES = ["usd", "cad", "gbp", "aud"] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

export const PLAN_IDS = ["direct", "agency"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanConfig = {
  name: string;
  description: string;
  // Flat monthly fee.
  monthly: Record<BillingCurrency, number>;
  // Minutes included each month before per-minute charges start.
  includedMinutes: number;
  // Per minute after the included minutes.
  perMinute: Record<BillingCurrency, number>;
};

export const PLANS: Record<PlanId, PlanConfig> = {
  direct: {
    name: "AI Receptionist",
    description: "24/7 AI receptionist for one business",
    monthly: { usd: 14900, cad: 19900, gbp: 11900, aud: 22900 },
    includedMinutes: 300,
    perMinute: { usd: 40, cad: 55, gbp: 32, aud: 60 },
  },
  agency: {
    name: "Agency platform",
    description: "White-label receptionists for all of an agency's clients",
    monthly: { usd: 9900, cad: 13500, gbp: 7900, aud: 14900 },
    includedMinutes: 0,
    perMinute: { usd: 20, cad: 27, gbp: 16, aud: 30 },
  },
};

export const TRIAL_DAYS = 14;

// Stripe Billing Meter that call minutes are reported to.
export const METER_EVENT_NAME = "receptionist_minutes";

// Tag on every Stripe object we create, to tell them apart from other
// products on the same Stripe account.
export const STRIPE_APP_TAG = "receptionist";

const COUNTRY_CURRENCY: Record<CountryCode, BillingCurrency> = {
  US: "usd",
  CA: "cad",
  GB: "gbp",
  AU: "aud",
  UG: "usd", // no UGX pricing; Ugandan businesses pay in US dollars
};

export function currencyForCountry(country: CountryCode | string | null | undefined): BillingCurrency {
  return COUNTRY_CURRENCY[country as CountryCode] ?? "usd";
}

export function isBillingCurrency(value: unknown): value is BillingCurrency {
  return typeof value === "string" && (BILLING_CURRENCIES as readonly string[]).includes(value);
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export function lookupKey(plan: PlanId, part: "monthly" | "minutes", currency: BillingCurrency): string {
  return `${STRIPE_APP_TAG}_${plan}_${part}_${currency}_${PRICE_VERSION}`;
}

export function productId(plan: PlanId): string {
  return `${STRIPE_APP_TAG}_${plan}`;
}

// Whole minutes billed for one call: rounded up, so a 61-second call is 2.
export function billableMinutes(durationSeconds: number | null | undefined): number {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return Math.ceil(durationSeconds / 60);
}

const SYMBOL: Record<BillingCurrency, string> = { usd: "$", cad: "CA$", gbp: "£", aud: "A$" };

export function formatMoney(amountMinor: number, currency: BillingCurrency): string {
  const major = amountMinor / 100;
  const text = Number.isInteger(major) ? String(major) : major.toFixed(2);
  return `${SYMBOL[currency]}${text}`;
}

// "$149/month, 300 minutes included, then $0.40/min"
export function describePrice(plan: PlanId, currency: BillingCurrency): string {
  const p = PLANS[plan];
  const base = `${formatMoney(p.monthly[currency], currency)}/month`;
  const perMin = `${formatMoney(p.perMinute[currency], currency)}/min`;
  return p.includedMinutes > 0
    ? `${base}, ${p.includedMinutes} minutes included, then ${perMin}`
    : `${base} plus ${perMin}`;
}

// Which Stripe subscription statuses keep receptionists answering.
//   active / trialing — paid up
//   past_due          — a payment failed; Stripe is retrying (grace period)
// Anything else (unpaid, canceled, incomplete_expired, paused) is lapsed.
export function isInGoodStanding(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

// Whether to start a checkout: no subscription yet, or the old one ended.
export function needsCheckout(status: string): boolean {
  return status === "none" || status === "canceled" || status === "incomplete_expired";
}
