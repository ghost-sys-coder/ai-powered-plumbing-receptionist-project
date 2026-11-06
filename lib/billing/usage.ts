import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calls, customers, type BillingAccount } from "@/db/schema";
import { billingOwnerForCustomer, findAccount } from "./accounts";
import { METER_EVENT_NAME, billableMinutes, isInGoodStanding } from "./plans";
import { isBillingConfigured, stripe } from "./stripe";

// Stripe accepts meter events up to 35 days old.
const MAX_EVENT_AGE_MS = 34 * 24 * 60 * 60 * 1000;

// Reports one finished call's minutes to Stripe. Each call is claimed once
// (calls.usage_reported_at), and the meter event's identifier is the call id,
// so retried webhooks never bill twice. Never throws: billing problems must
// not break call handling.
export async function reportCallUsage(callId: string): Promise<void> {
  if (!isBillingConfigured()) return;
  try {
    const [call] = await db
      .select({
        customerId: calls.customerId,
        durationSeconds: calls.durationSeconds,
        endedAt: calls.endedAt,
        reportedAt: calls.usageReportedAt,
      })
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);
    if (!call || call.reportedAt || !call.endedAt) return;

    const minutes = billableMinutes(call.durationSeconds);
    const owner = await billingOwnerForCustomer(call.customerId);
    const account = owner ? await findAccount(owner) : null;
    // Only subscribed accounts are metered. Calls before a subscription (or
    // from pilot customers) are marked as not billed.
    const billable = minutes > 0 && !!account && account.stripeSubscriptionId && isInGoodStanding(account.status);
    const sent = billable ? minutes : 0;

    const claimed = await db
      .update(calls)
      .set({ usageReportedAt: new Date(), billedMinutes: sent })
      .where(and(eq(calls.id, callId), isNull(calls.usageReportedAt)))
      .returning({ id: calls.id });
    if (claimed.length === 0 || !billable || !account) return;

    const endedMs = call.endedAt.getTime();
    const timestamp = Math.floor(Math.max(endedMs, Date.now() - MAX_EVENT_AGE_MS) / 1000);
    try {
      await stripe().billing.meterEvents.create({
        event_name: METER_EVENT_NAME,
        identifier: `call_${callId}`,
        timestamp,
        payload: { stripe_customer_id: account.stripeCustomerId, value: String(sent) },
      });
    } catch (err) {
      // Stripe already has this call (an earlier attempt that timed out on
      // our side but reached Stripe): it's billed, keep the claim.
      if (/already exists/i.test((err as Error).message ?? "")) return;
      // Un-claim so a later report can retry.
      await db
        .update(calls)
        .set({ usageReportedAt: null, billedMinutes: null })
        .where(eq(calls.id, callId));
      throw err;
    }
  } catch (err) {
    console.error(`[billing] reporting usage for call ${callId} failed:`, err);
  }
}

// Re-reports finished calls whose usage never reached Stripe (Stripe was
// down, a deploy cut the request short, ...). Calls younger than 15 minutes
// are left to the normal end-of-call path; older than Stripe's 35-day window
// can't be metered any more. Safe to run often: reportCallUsage claims each
// call once and Stripe rejects duplicate identifiers.
export async function sweepUnreportedUsage(limit = 200): Promise<{ checked: number }> {
  if (!isBillingConfigured()) return { checked: 0 };
  const now = Date.now();
  const rows = await db
    .select({ id: calls.id })
    .from(calls)
    .where(
      and(
        isNull(calls.usageReportedAt),
        isNotNull(calls.endedAt),
        lt(calls.endedAt, new Date(now - 15 * 60 * 1000)),
        gte(calls.endedAt, new Date(now - MAX_EVENT_AGE_MS))
      )
    )
    .orderBy(asc(calls.endedAt))
    .limit(limit);
  for (const row of rows) await reportCallUsage(row.id);
  return { checked: rows.length };
}

// Minutes billed to an account in its current period.
export async function minutesThisPeriod(account: BillingAccount): Promise<number> {
  if (!account.currentPeriodStart) return 0;
  const customerIds =
    account.kind === "direct"
      ? account.customerId
        ? [account.customerId]
        : []
      : account.organizationId
        ? (
            await db
              .select({ id: customers.id })
              .from(customers)
              .where(eq(customers.organizationId, account.organizationId))
          ).map((r) => r.id)
        : [];
  if (customerIds.length === 0) return 0;
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${calls.billedMinutes}), 0)::int` })
    .from(calls)
    .where(and(inArray(calls.customerId, customerIds), gte(calls.usageReportedAt, account.currentPeriodStart)));
  return row?.total ?? 0;
}
