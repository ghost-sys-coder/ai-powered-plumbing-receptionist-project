import { describe, expect, it } from "vitest";
import { numberSourcing } from "./phone-numbers";

const twilio = { TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "tok" };

describe("numberSourcing", () => {
  it("keeps US numbers on the voice provider, with or without Twilio", () => {
    expect(numberSourcing("US", {})).toEqual({ kind: "provider" });
    expect(numberSourcing("US", twilio)).toEqual({ kind: "provider" });
  });

  it("buys Canadian numbers on Twilio without a bundle", () => {
    expect(numberSourcing("CA", twilio)).toEqual({ kind: "twilio", country: "CA" });
  });

  it("needs Twilio for every non-US country", () => {
    for (const c of ["CA", "GB", "AU"] as const) {
      const s = numberSourcing(c, {});
      expect(s.kind).toBe("unavailable");
      if (s.kind === "unavailable") expect(s.reason).toMatch(/Twilio/);
    }
  });

  it("needs an approved bundle for UK and Australian numbers", () => {
    const gb = numberSourcing("GB", twilio);
    expect(gb.kind).toBe("unavailable");
    if (gb.kind === "unavailable") expect(gb.reason).toContain("TWILIO_BUNDLE_SID_GB");

    expect(numberSourcing("GB", { ...twilio, TWILIO_BUNDLE_SID_GB: " BU1 " })).toEqual({
      kind: "twilio",
      country: "GB",
      bundleSid: "BU1",
      addressSid: undefined,
    });
    expect(
      numberSourcing("AU", { ...twilio, TWILIO_BUNDLE_SID_AU: "BU2", TWILIO_ADDRESS_SID_AU: "AD2" })
    ).toEqual({ kind: "twilio", country: "AU", bundleSid: "BU2", addressSid: "AD2" });
    // A bundle for one country doesn't unlock another.
    expect(numberSourcing("AU", { ...twilio, TWILIO_BUNDLE_SID_GB: "BU1" }).kind).toBe("unavailable");
  });

  it("explains that Ugandan numbers aren't automatic", () => {
    const ug = numberSourcing("UG", twilio);
    expect(ug.kind).toBe("unavailable");
    if (ug.kind === "unavailable") expect(ug.reason).toMatch(/Ugandan/);
  });
});
