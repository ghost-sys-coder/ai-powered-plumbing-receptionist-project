import type { CountryCode } from "@/lib/regions";

// What we charge. Amounts are in the currency's smallest unit (cents/pence).
// Each currency is priced on its own (rounded local prices, not converted).
//
// Changing a price: bump PRICE_VERSION, edit the amounts, run
// `npx tsx scripts/stripe-setup.ts --apply`. New prices get new lookup keys;
// existing subscribers stay on their old price until moved.

export const PRICE_VERSION = "v2";

export const BILLING_CURRENCIES = ["usd", "cad", "gbp", "aud"] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

// Who pays: a business billed directly, or an agency billed for all its clients.
export const ACCOUNT_KINDS = ["direct", "agency"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const PLAN_IDS = [
  "direct_basic",
  "direct_standard",
  "direct_pro",
  "agency_starter",
  "agency_pro",
  "agency_unlimited",
] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanConfig = {
  kind: AccountKind;
  name: string;
  description: string;
  // Flat monthly fee.
  monthly: Record<BillingCurrency, number>;
  // Minutes included each month before per-minute charges start.
  includedMinutes: number;
  // Per minute after the included minutes.
  perMinute: Record<BillingCurrency, number>;
  // Agencies: how many client businesses the plan covers (null = unlimited).
  clientLimit: number | null;
  // Short selling points, shown on plan cards.
  features: string[];
};

// Direct prices sit at agency retail level so we never undercut our agencies.
export const PLANS: Record<PlanId, PlanConfig> = {
  direct_basic: {
    kind: "direct",
    name: "Basic",
    description: "For a single business getting started",
    monthly: { usd: 19900, cad: 26900, gbp: 15900, aud: 29900 },
    includedMinutes: 500,
    perMinute: { usd: 30, cad: 40, gbp: 24, aud: 45 },
    clientLimit: null,
    features: ["500 minutes a month", "Every feature included", "Email support"],
  },
  direct_standard: {
    kind: "direct",
    name: "Standard",
    description: "For a busy business with steady call volume",
    monthly: { usd: 34900, cad: 47900, gbp: 27900, aud: 52900 },
    includedMinutes: 1000,
    perMinute: { usd: 30, cad: 40, gbp: 24, aud: 45 },
    clientLimit: null,
    features: ["1,000 minutes a month", "Every feature included", "Email support"],
  },
  direct_pro: {
    kind: "direct",
    name: "Pro",
    description: "For high-volume and multi-crew businesses",
    monthly: { usd: 59900, cad: 81900, gbp: 47900, aud: 89900 },
    includedMinutes: 2000,
    perMinute: { usd: 30, cad: 40, gbp: 24, aud: 45 },
    clientLimit: null,
    features: ["2,000 minutes a month", "Every feature included", "Priority support"],
  },
  agency_starter: {
    kind: "agency",
    name: "Starter",
    description: "Try reselling with your first few clients",
    monthly: { usd: 9700, cad: 12900, gbp: 7900, aud: 14900 },
    includedMinutes: 0,
    perMinute: { usd: 15, cad: 20, gbp: 12, aud: 23 },
    clientLimit: 3,
    features: ["Up to 3 clients", "Pay only for minutes used", "A dashboard for each client"],
  },
  agency_pro: {
    kind: "agency",
    name: "Pro",
    description: "Run receptionists for a growing client list",
    monthly: { usd: 29700, cad: 39900, gbp: 23900, aud: 44900 },
    includedMinutes: 0,
    perMinute: { usd: 14, cad: 19, gbp: 11, aud: 21 },
    clientLimit: 25,
    features: ["Up to 25 clients", "Lower per-minute rate", "Your agency's branding (coming soon)"],
  },
  agency_unlimited: {
    kind: "agency",
    name: "Agency",
    description: "Unlimited clients under your own brand",
    monthly: { usd: 59700, cad: 79900, gbp: 46900, aud: 88900 },
    includedMinutes: 0,
    perMinute: { usd: 13, cad: 18, gbp: 10, aud: 20 },
    clientLimit: null,
    features: ["Unlimited clients", "Lowest per-minute rate", "Priority support", "Custom domain (coming soon)"],
  },
};

// The plan shown first / assumed for accounts that haven't picked one.
export const DEFAULT_PLAN: Record<AccountKind, PlanId> = {
  direct: "direct_standard",
  agency: "agency_starter",
};

export function plansFor(kind: AccountKind): PlanId[] {
  return PLAN_IDS.filter((id) => PLANS[id].kind === kind);
}

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

// A stored plan id, if it's current and belongs to this kind of account.
export function planOrDefault(plan: string | null | undefined, kind: AccountKind): PlanId {
  return isPlanId(plan) && PLANS[plan].kind === kind ? plan : DEFAULT_PLAN[kind];
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
  const text = Number.isInteger(major) ? major.toLocaleString("en-US") : major.toFixed(2);
  return `${SYMBOL[currency]}${text}`;
}

// "$349/month, 1,000 minutes included, then $0.30/min"
export function describePrice(plan: PlanId, currency: BillingCurrency): string {
  const p = PLANS[plan];
  const base = `${formatMoney(p.monthly[currency], currency)}/month`;
  const perMin = `${formatMoney(p.perMinute[currency], currency)}/min`;
  return p.includedMinutes > 0
    ? `${base}, ${p.includedMinutes.toLocaleString("en-US")} minutes included, then ${perMin}`
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
