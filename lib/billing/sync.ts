import type Stripe from "stripe";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { billingAccounts, customers, vapiAgents, type BillingAccount } from "@/db/schema";
import { getCustomerReceptionist } from "@/lib/voice";
import { findAccountByStripeCustomer } from "./accounts";
import { STRIPE_APP_TAG, isInGoodStanding } from "./plans";
import { stripe } from "./stripe";

const toDate = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : null);

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

// The subscription fields we mirror. Billing periods live on subscription
// items in current API versions; all our items share one period.
export function subscriptionFields(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  return {
    stripeSubscriptionId: sub.id,
    status: sub.status,
    currency: sub.currency,
    trialEndsAt: toDate(sub.trial_end),
    currentPeriodStart: toDate(item?.current_period_start),
    currentPeriodEnd: toDate(item?.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end || !!sub.cancel_at,
  };
}

// Re-reads the subscription from Stripe and stores it. Always fetching the
// latest copy (rather than trusting the event payload) makes out-of-order or
// replayed webhooks harmless.
export async function syncSubscription(subscriptionId: string): Promise<void> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const stripeCustomerId = idOf(sub.customer);
  if (!stripeCustomerId) return;
  const account = await findAccountByStripeCustomer(stripeCustomerId);
  if (!account) {
    if (sub.metadata?.app === STRIPE_APP_TAG) {
      console.warn(`[billing] subscription ${sub.id} for unknown customer ${stripeCustomerId}`);
    }
    return; // another product on the same Stripe account
  }

  // A customer can end up with an old cancelled subscription and a new one;
  // a stale event for the old one must not overwrite the current state.
  if (
    account.stripeSubscriptionId &&
    account.stripeSubscriptionId !== sub.id &&
    !isInGoodStanding(sub.status) &&
    isInGoodStanding(account.status)
  ) {
    return;
  }

  const fields = subscriptionFields(sub);
  const [updated] = await db
    .update(billingAccounts)
    .set(fields)
    .where(eq(billingAccounts.id, account.id))
    .returning();
  console.log(`[billing] ${account.kind} account ${account.id}: ${account.status} → ${fields.status}`);
  await enforceStanding(updated);
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subId = idOf(session.subscription);
      if (subId) await syncSubscription(subId);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object.id);
      break;
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subId = idOf(event.data.object.parent?.subscription_details?.subscription);
      if (subId) await syncSubscription(subId);
      break;
    }
    default:
      break;
  }
}

// ---- suspension -------------------------------------------------------------

function enforcementEnabled(): boolean {
  return process.env.BILLING_ENFORCEMENT === "on";
}

async function coveredCustomerIds(account: BillingAccount): Promise<string[]> {
  if (account.kind === "direct") return account.customerId ? [account.customerId] : [];
  if (!account.organizationId) return [];
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.organizationId, account.organizationId));
  return rows.map((r) => r.id);
}

// Lapsed accounts (unpaid, cancelled…) have their receptionists' numbers
// disconnected; they're reconnected as soon as the account is in good
// standing again. past_due keeps working while Stripe retries the payment.
// Switching off is gated by BILLING_ENFORCEMENT=on; switching back on always runs.
export async function enforceStanding(account: BillingAccount): Promise<void> {
  const lapsed = account.status !== "none" && !isInGoodStanding(account.status);

  if (lapsed && !account.suspendedAt) {
    if (!enforcementEnabled()) {
      console.log(`[billing] account ${account.id} lapsed (${account.status}); enforcement off, not suspending`);
      return;
    }
    const ids = await coveredCustomerIds(account);
    const agents = ids.length
      ? await db
          .select({ id: vapiAgents.id, customerId: vapiAgents.customerId })
          .from(vapiAgents)
          .where(
            and(
              inArray(vapiAgents.customerId, ids),
              eq(vapiAgents.status, "active"),
              isNotNull(vapiAgents.vapiPhoneNumberId)
            )
          )
      : [];
    for (const agent of agents) {
      try {
        const r = await getCustomerReceptionist(agent.customerId);
        if (r?.phoneNumberId) await r.provider.detachPhoneNumber(r.phoneNumberId);
        await db
          .update(vapiAgents)
          .set({ status: "paused", billingSuspendedAt: new Date() })
          .where(eq(vapiAgents.id, agent.id));
      } catch (err) {
        console.error(`[billing] suspending agent ${agent.id} failed:`, err);
      }
    }
    await db.update(billingAccounts).set({ suspendedAt: new Date() }).where(eq(billingAccounts.id, account.id));
    console.log(`[billing] account ${account.id} suspended (${agents.length} receptionist(s))`);
    return;
  }

  if (!lapsed && account.suspendedAt) {
    const ids = await coveredCustomerIds(account);
    const agents = ids.length
      ? await db
          .select({ id: vapiAgents.id, customerId: vapiAgents.customerId })
          .from(vapiAgents)
          .where(and(inArray(vapiAgents.customerId, ids), isNotNull(vapiAgents.billingSuspendedAt)))
      : [];
    let failed = 0;
    for (const agent of agents) {
      try {
        const r = await getCustomerReceptionist(agent.customerId);
        if (r?.phoneNumberId) await r.provider.attachPhoneNumber(r.phoneNumberId, r.agentId);
        await db
          .update(vapiAgents)
          .set({ status: "active", billingSuspendedAt: null })
          .where(eq(vapiAgents.id, agent.id));
      } catch (err) {
        failed++;
        console.error(`[billing] resuming agent ${agent.id} failed:`, err);
      }
    }
    // Keep the account marked suspended if any receptionist is still off, so
    // the next event retries it.
    if (failed === 0) {
      await db
        .update(billingAccounts)
        .set({ suspendedAt: null })
        .where(and(eq(billingAccounts.id, account.id), isNotNull(billingAccounts.suspendedAt)));
    }
    console.log(`[billing] account ${account.id} resumed (${agents.length - failed}/${agents.length})`);
  }
}

