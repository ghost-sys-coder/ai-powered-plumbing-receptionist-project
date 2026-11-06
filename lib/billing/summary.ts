import { findAccount, type BillingOwner } from "./accounts";
import {
  PLANS,
  describePrice,
  formatMoney,
  isBillingCurrency,
  isInGoodStanding,
  needsCheckout,
  planOrDefault,
  trialDaysFor,
  plansFor,
  type AccountKind,
  type BillingCurrency,
  type PlanId,
} from "./plans";
import { isBillingConfigured } from "./stripe";
import { minutesThisPeriod } from "./usage";

export type BillingTone = "good" | "warn" | "bad" | "neutral";

// One plan as offered on the billing panel, priced in the account's currency.
export type PlanOption = {
  id: PlanId;
  name: string;
  description: string;
  monthlyText: string;
  perMinuteText: string;
  includedMinutes: number;
  clientLimit: number | null;
  features: string[];
  // Free-trial days on a first subscription (0 = charged straight away).
  trialDays: number;
  hidden: boolean;
};

export function planOptions(
  kind: AccountKind,
  currency: BillingCurrency,
  opts: { includeHidden?: boolean } = {}
): PlanOption[] {
  return plansFor(kind, opts).map((id) => {
    const p = PLANS[id];
    return {
      id,
      name: p.name,
      description: p.description,
      monthlyText: formatMoney(p.monthly[currency], currency),
      perMinuteText: formatMoney(p.perMinute[currency], currency),
      includedMinutes: p.includedMinutes,
      clientLimit: p.clientLimit,
      features: p.features,
      trialDays: trialDaysFor(id),
      hidden: !!p.hidden,
    };
  });
}

// Plain data for the billing panel (safe to pass to a client component).
export type BillingSummary = {
  configured: boolean;
  kind: AccountKind;
  // The current plan, or the suggested one before the first checkout.
  plan: PlanId;
  planName: string;
  plans: PlanOption[];
  // Whether the plan can be switched right now (a live subscription).
  canChangePlan: boolean;
  status: string;
  statusLabel: string;
  tone: BillingTone;
  priceText: string;
  // "$149" and "$0.40" for the headline price and the per-minute rate.
  monthlyText: string;
  perMinuteText: string;
  currency: BillingCurrency;
  trialEndsAt: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  minutesUsed: number;
  includedMinutes: number;
  suspended: boolean;
  canStart: boolean;
  hasAccount: boolean;
};

const LABELS: Record<string, [string, BillingTone]> = {
  none: ["No subscription", "neutral"],
  trialing: ["Free trial", "good"],
  active: ["Active", "good"],
  past_due: ["Payment failed — retrying", "warn"],
  unpaid: ["Unpaid", "bad"],
  canceled: ["Cancelled", "bad"],
  incomplete: ["Waiting for first payment", "warn"],
  incomplete_expired: ["Checkout expired", "neutral"],
  paused: ["Paused", "bad"],
};

export function statusLabel(status: string): [string, BillingTone] {
  return LABELS[status] ?? [status, "neutral"];
}

export async function getBillingSummary(
  owner: Exclude<BillingOwner, { kind: "exempt" }>,
  fallbackCurrency: BillingCurrency = "usd",
  // Platform admins also see hidden plans (the live-payment test plan).
  opts: { includeHidden?: boolean } = {}
): Promise<BillingSummary> {
  const account = isBillingConfigured() ? await findAccount(owner) : null;
  const plan = planOrDefault(account?.plan, owner.kind);
  const status = account?.status ?? "none";
  const currency =
    account?.currency && isBillingCurrency(account.currency)
      ? account.currency
      : owner.kind === "direct"
        ? owner.currency
        : fallbackCurrency;
  const [label, tone] = statusLabel(status);
  return {
    configured: isBillingConfigured(),
    kind: owner.kind,
    plan,
    planName: PLANS[plan].name,
    plans: planOptions(owner.kind, currency, {
      // Always include the current plan, even if hidden, so it can be shown.
      includeHidden: opts.includeHidden || !!PLANS[plan].hidden,
    }),
    canChangePlan: !!account?.stripeSubscriptionId && isInGoodStanding(status),
    status,
    statusLabel: label,
    tone,
    priceText: describePrice(plan, currency),
    monthlyText: formatMoney(PLANS[plan].monthly[currency], currency),
    perMinuteText: formatMoney(PLANS[plan].perMinute[currency], currency),
    currency,
    trialEndsAt: status === "trialing" ? (account?.trialEndsAt?.toISOString() ?? null) : null,
    periodEnd: account?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: account?.cancelAtPeriodEnd ?? false,
    minutesUsed: account ? await minutesThisPeriod(account) : 0,
    includedMinutes: PLANS[plan].includedMinutes,
    suspended: !!account?.suspendedAt,
    canStart: needsCheckout(status),
    hasAccount: !!account,
  };
}
