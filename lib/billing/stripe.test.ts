import { describe, expect, it } from "vitest";
import { isBillingConfigured, isLiveMode } from "./stripe";

describe("stripe mode", () => {
  it("tells live keys from test keys", () => {
    expect(isLiveMode({ STRIPE_SECRET_KEY: "rk_live_abc" })).toBe(true);
    expect(isLiveMode({ STRIPE_SECRET_KEY: "sk_live_abc" })).toBe(true);
    expect(isLiveMode({ STRIPE_SECRET_KEY: "rk_test_abc" })).toBe(false);
    expect(isLiveMode({})).toBe(false);
  });

  it("is configured only with a secret key", () => {
    expect(isBillingConfigured({ STRIPE_SECRET_KEY: "rk_test_abc" })).toBe(true);
    expect(isBillingConfigured({})).toBe(false);
  });
});
