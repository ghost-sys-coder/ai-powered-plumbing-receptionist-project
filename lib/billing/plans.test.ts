import { describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "@/lib/regions";
import {
  BILLING_CURRENCIES,
  ACCOUNT_KINDS,
  DEFAULT_PLAN,
  PLAN_IDS,
  PLANS,
  planOrDefault,
  plansFor,
  TRIAL_DAYS,
  billableMinutes,
  clientLimitFor,
  trialDaysFor,
  currencyForCountry,
  describePrice,
  isInGoodStanding,
  lookupKey,
  needsCheckout,
} from "./plans";

describe("plans", () => {
  it("prices every plan in every currency", () => {
    for (const plan of PLAN_IDS) {
      for (const c of BILLING_CURRENCIES) {
        expect(PLANS[plan].monthly[c], `${plan} ${c}`).toBeGreaterThan(0);
        expect(PLANS[plan].perMinute[c], `${plan} ${c}`).toBeGreaterThan(0);
      }
    }
  });

  it("maps every supported country to a billing currency", () => {
    for (const country of COUNTRY_CODES) expect(BILLING_CURRENCIES).toContain(currencyForCountry(country));
    expect(currencyForCountry("GB")).toBe("gbp");
    expect(currencyForCountry("UG")).toBe("usd");
    expect(currencyForCountry("ZZ")).toBe("usd");
  });

  it("builds stable, versioned lookup keys", () => {
    expect(lookupKey("direct_basic", "minutes", "aud")).toBe("receptionist_direct_basic_minutes_aud_v2");
  });

  it("rounds each call up to whole minutes", () => {
    expect(billableMinutes(null)).toBe(0);
    expect(billableMinutes(0)).toBe(0);
    expect(billableMinutes(1)).toBe(1);
    expect(billableMinutes(60)).toBe(1);
    expect(billableMinutes(61)).toBe(2);
  });

  it("describes prices in local currency", () => {
    expect(describePrice("direct_standard", "usd")).toBe("$349/month, 1,000 minutes included, then $0.30/min");
    expect(describePrice("agency_starter", "gbp")).toBe("£79/month plus £0.12/min");
  });

  it("matches the agreed USD prices", () => {
    const usd = (id: keyof typeof PLANS) => [PLANS[id].monthly.usd, PLANS[id].includedMinutes, PLANS[id].perMinute.usd];
    expect(usd("direct_basic")).toEqual([19900, 500, 30]);
    expect(usd("direct_standard")).toEqual([34900, 1000, 30]);
    expect(usd("direct_pro")).toEqual([59900, 2000, 30]);
    expect(usd("agency_starter")).toEqual([9700, 0, 15]);
    expect(usd("agency_pro")).toEqual([29700, 0, 14]);
    expect(usd("agency_unlimited")).toEqual([59700, 0, 13]);
  });

  it("has three plans per account kind, and a default of the same kind", () => {
    for (const kind of ACCOUNT_KINDS) {
      expect(plansFor(kind)).toHaveLength(3);
      expect(PLANS[DEFAULT_PLAN[kind]].kind).toBe(kind);
    }
  });

  it("never lets a direct plan undercut the matching agency plan's monthly fee", () => {
    const direct = plansFor("direct");
    const agency = plansFor("agency");
    direct.forEach((d, i) => {
      for (const c of BILLING_CURRENCIES) expect(PLANS[d].monthly[c]).toBeGreaterThan(PLANS[agency[i]].monthly[c] ?? 0);
    });
  });

  it("falls back to the default plan for unknown or mismatched plans", () => {
    expect(planOrDefault(null, "direct")).toBe("direct_standard");
    expect(planOrDefault("direct", "direct")).toBe("direct_standard"); // pre-tier value
    expect(planOrDefault("agency_pro", "direct")).toBe("direct_standard");
    expect(planOrDefault("direct_pro", "direct")).toBe("direct_pro");
  });

  it("keeps receptionists on while paid up or retrying a payment", () => {
    expect(["active", "trialing", "past_due"].every(isInGoodStanding)).toBe(true);
    expect(["unpaid", "canceled", "incomplete_expired", "paused", "none"].some(isInGoodStanding)).toBe(false);
  });

  it("offers checkout only when there's no live subscription", () => {
    expect(needsCheckout("none")).toBe(true);
    expect(needsCheckout("canceled")).toBe(true);
    expect(needsCheckout("active")).toBe(false);
    expect(needsCheckout("past_due")).toBe(false);
  });

  it("limits agency clients only on a live subscription with a known plan", () => {
    expect(clientLimitFor({ plan: "agency_starter", status: "active" })).toEqual({ limit: 3, planName: "Starter" });
    expect(clientLimitFor({ plan: "agency_pro", status: "past_due" }).limit).toBe(25);
    expect(clientLimitFor({ plan: "agency_unlimited", status: "trialing" }).limit).toBeNull();
    expect(clientLimitFor({ plan: "agency_starter", status: "canceled" }).limit).toBeNull();
    expect(clientLimitFor({ plan: null, status: "active" }).limit).toBeNull();
    expect(clientLimitFor(null).limit).toBeNull();
  });

  it("keeps the live-test plan hidden, chargeable and trial-free", () => {
    expect(plansFor("direct")).not.toContain("direct_live_test");
    expect(plansFor("direct", { includeHidden: true })).toContain("direct_live_test");
    // Stripe minimum charges: anything lower is never actually charged.
    const min = { usd: 50, cad: 50, gbp: 30, aud: 50 } as const;
    for (const c of BILLING_CURRENCIES) expect(PLANS.direct_live_test.monthly[c]).toBeGreaterThanOrEqual(min[c]);
    expect(trialDaysFor("direct_live_test")).toBe(0);
    expect(trialDaysFor("direct_basic")).toBe(TRIAL_DAYS);
    expect(TRIAL_DAYS).toBeLessThan(14);
  });
});
