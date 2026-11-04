import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  findAccount: vi.fn(),
  update: vi.fn(),
}));

vi.mock("./stripe", () => ({ stripe: () => ({ subscriptions: { retrieve: mocks.retrieve } }) }));
vi.mock("./accounts", () => ({ findAccountByStripeCustomer: mocks.findAccount }));
vi.mock("@/lib/voice", () => ({ getCustomerReceptionist: vi.fn() }));
vi.mock("@/db/drizzle", () => ({
  db: {
    update: () => ({
      set: (fields: unknown) => ({
        where: () => ({
          returning: async () => {
            mocks.update(fields);
            return [{ ...(fields as object), id: "acc1", kind: "direct", suspendedAt: null }];
          },
        }),
      }),
    }),
  },
}));

import { handleStripeEvent, subscriptionFields } from "./sync";

function sub(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "trialing",
    currency: "gbp",
    trial_end: 1_800_000_000,
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: { app: "receptionist" },
    items: { data: [{ current_period_start: 1_799_000_000, current_period_end: 1_800_000_000 }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("subscriptionFields", () => {
  it("reads the billing period from the subscription item", () => {
    expect(subscriptionFields(sub())).toEqual({
      stripeSubscriptionId: "sub_1",
      status: "trialing",
      currency: "gbp",
      trialEndsAt: new Date(1_800_000_000_000),
      currentPeriodStart: new Date(1_799_000_000_000),
      currentPeriodEnd: new Date(1_800_000_000_000),
      cancelAtPeriodEnd: false,
    });
  });

  it("treats a scheduled cancellation as cancelling", () => {
    expect(subscriptionFields(sub({ cancel_at: 1_800_000_000 })).cancelAtPeriodEnd).toBe(true);
  });
});

describe("handleStripeEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("re-reads the subscription and stores it", async () => {
    mocks.retrieve.mockResolvedValue(sub({ status: "active" }));
    mocks.findAccount.mockResolvedValue({ id: "acc1", status: "trialing", stripeSubscriptionId: "sub_1" });
    await handleStripeEvent({
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1" } },
    } as unknown as Stripe.Event);
    expect(mocks.retrieve).toHaveBeenCalledWith("sub_1");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }));
  });

  it("finds the subscription on invoices", async () => {
    mocks.retrieve.mockResolvedValue(sub({ status: "past_due" }));
    mocks.findAccount.mockResolvedValue({ id: "acc1", status: "active", stripeSubscriptionId: "sub_1" });
    await handleStripeEvent({
      type: "invoice.payment_failed",
      data: { object: { parent: { subscription_details: { subscription: "sub_1" } } } },
    } as unknown as Stripe.Event);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: "past_due" }));
  });

  it("ignores subscriptions from other products on the account", async () => {
    mocks.retrieve.mockResolvedValue(sub({ metadata: {} }));
    mocks.findAccount.mockResolvedValue(null);
    await handleStripeEvent({
      type: "customer.subscription.created",
      data: { object: { id: "sub_1" } },
    } as unknown as Stripe.Event);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("doesn't let a stale old subscription overwrite a live one", async () => {
    mocks.retrieve.mockResolvedValue(sub({ id: "sub_old", status: "canceled" }));
    mocks.findAccount.mockResolvedValue({ id: "acc1", status: "active", stripeSubscriptionId: "sub_new" });
    await handleStripeEvent({
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_old" } },
    } as unknown as Stripe.Event);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
