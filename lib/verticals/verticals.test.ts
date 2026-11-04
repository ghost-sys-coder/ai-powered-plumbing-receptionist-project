import { describe, expect, it } from "vitest";
import {
  INDUSTRY_IDS,
  getIndustry,
  isIndustryId,
  listIndustries,
  listIndustriesByCategory,
} from "./index";
import { COUNTRY_CODES, getRegion, isCountryCode, listRegions } from "@/lib/regions";
import { callDataSchema } from "@/lib/services/vapi-provisioning";

// Keys the webhook and dashboards already own; intake fields must not reuse them.
const CORE_KEYS = [
  "caller_name",
  "issue_summary",
  "urgency_level",
  "service_address",
  "callback_number",
  "outcome",
  "booking_time",
];

describe("industry registry", () => {
  it("has a profile for every id, with matching ids", () => {
    expect(listIndustries().map((p) => p.id)).toEqual([...INDUSTRY_IDS]);
  });

  it("puts every industry in exactly one category group", () => {
    const grouped = listIndustriesByCategory().flatMap((g) => g.industries.map((p) => p.id));
    expect(grouped.sort()).toEqual([...INDUSTRY_IDS].sort());
  });

  it("falls back to plumbing for unknown or missing ids", () => {
    expect(getIndustry(undefined).id).toBe("plumbing");
    expect(getIndustry("not-a-real-industry").id).toBe("plumbing");
    expect(isIndustryId("legal")).toBe(true);
    expect(isIndustryId("Legal")).toBe(false);
  });
});

describe.each(listIndustries())("$id profile", (profile) => {
  it("has unique intake keys that don't collide with core call fields", () => {
    const keys = profile.intakeFields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(CORE_KEYS).not.toContain(key);
      expect(key).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("registers its intake fields in the call-data schema", () => {
    const schema = callDataSchema(profile);
    for (const field of profile.intakeFields) {
      expect(schema.properties).toHaveProperty(field.key);
    }
    for (const key of CORE_KEYS) expect(schema.properties).toHaveProperty(key);
  });

  it("produces safety rules and an emergency definition for every country", () => {
    for (const region of listRegions()) {
      expect(profile.safetyRules(region).length).toBeGreaterThan(0);
      expect(profile.defaultEmergencyDefinition(region).length).toBeGreaterThan(20);
    }
  });

  it("never offers live transfer for human-health emergencies it routes to emergency services", () => {
    if (profile.id === "clinic" || profile.id === "physiotherapy") {
      expect(profile.allowsLiveTransfer).toBe(false);
    }
  });
});

describe("country registry", () => {
  it("has a profile for every code", () => {
    expect(listRegions().map((r) => r.code)).toEqual([...COUNTRY_CODES]);
  });

  it("falls back to the US", () => {
    expect(getRegion(null).code).toBe("US");
    expect(isCountryCode("GB")).toBe(true);
    expect(isCountryCode("UK")).toBe(false);
  });

  it.each(listRegions())("$code has a valid default timezone in its own list", (region) => {
    expect(region.timezones.map((t) => t.value)).toContain(region.defaultTimezone);
    // Throws on an invalid IANA zone.
    expect(() => new Intl.DateTimeFormat("en", { timeZone: region.defaultTimezone })).not.toThrow();
  });

  it("uses the right emergency numbers", () => {
    expect(getRegion("US").emergencyNumber).toBe("911");
    expect(getRegion("CA").emergencyNumber).toBe("911");
    expect(getRegion("GB").emergencyNumber).toBe("999");
    expect(getRegion("AU").emergencyNumber).toBe("000");
    expect(getRegion("UG").emergencyNumber).toBe("999 or 112");
  });
});
