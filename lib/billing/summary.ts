import { findAccount, type BillingOwner } from "./accounts";
import {
  PLANS,
  describePrice,
  isBillingCurrency,
  needsCheckout,
  type BillingCurrency,
  type PlanId,
} from "./plans";
import { isBillingConfigured } from "./stripe";
import { minutesThisPeriod } from "./usage";

export type BillingTone = "good" | "warn" | "bad" | "neutral";

// Plain data for the billing panel (safe to pass to a client component).
export type BillingSummary = {
  configured: boolean;
  plan: PlanId;
  status: string;
  statusLabel: string;
  tone: BillingTone;
  priceText: string;
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
  fallbackCurrency: BillingCurrency = "usd"
): Promise<BillingSummary> {
  const plan: PlanId = owner.kind;
  const account = isBillingConfigured() ? await findAccount(owner) : null;
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
    plan,
    status,
    statusLabel: label,
    tone,
    priceText: describePrice(plan, currency),
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
