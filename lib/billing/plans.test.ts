import { describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "@/lib/regions";
import {
  BILLING_CURRENCIES,
  PLAN_IDS,
  PLANS,
  billableMinutes,
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
    expect(lookupKey("direct", "minutes", "aud")).toBe("receptionist_direct_minutes_aud_v1");
  });

  it("rounds each call up to whole minutes", () => {
    expect(billableMinutes(null)).toBe(0);
    expect(billableMinutes(0)).toBe(0);
    expect(billableMinutes(1)).toBe(1);
    expect(billableMinutes(60)).toBe(1);
    expect(billableMinutes(61)).toBe(2);
  });

  it("describes prices in local currency", () => {
    expect(describePrice("direct", "usd")).toBe("$149/month, 300 minutes included, then $0.40/min");
    expect(describePrice("agency", "gbp")).toBe("£79/month plus £0.16/min");
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
});
