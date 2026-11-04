import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAgentPrompt, isLiveTransferActive, type PromptConfig } from "./agent-prompt";
import { listIndustries } from "@/lib/verticals";
import { listRegions } from "@/lib/regions";

const FIXTURES = join(__dirname, "__fixtures__");
const read = (name: string) =>
  readFileSync(join(FIXTURES, name), "utf8").replace(/\r\n/g, "\n");

// The fixtures were produced by the prompt builder as it was before
// multi-industry support. Existing (plumbing, US) assistants must keep exactly
// this prompt — any diff here changes live customers' receptionists.
describe("plumbing/US prompt is unchanged from the original", () => {
  const configs = JSON.parse(read("plumbing-us-configs.json")) as Record<string, PromptConfig>;

  for (const [name, config] of Object.entries(configs)) {
    const expected = read(`plumbing-us-${name}.txt`);

    it(`${name}: no industry/country set (pre-existing customers)`, () => {
      expect(buildAgentPrompt(config)).toBe(expected);
    });

    it(`${name}: explicit plumbing/US`, () => {
      expect(buildAgentPrompt({ ...config, industry: "plumbing", country: "US" })).toBe(expected);
    });

    it(`${name}: null industry/country`, () => {
      expect(buildAgentPrompt({ ...config, industry: null, country: null })).toBe(expected);
    });
  }
});

describe("every industry × country builds a clean prompt", () => {
  for (const industry of listIndustries()) {
    for (const region of listRegions()) {
      it(`${industry.id} / ${region.code}`, () => {
        const prompt = buildAgentPrompt({
          businessName: "Acme",
          ownerName: "Sam",
          serviceArea: "Town",
          timezone: region.defaultTimezone,
          calendarType: "google_calendar",
          appointmentDurationMinutes: 60,
          servicesOffered: [],
          pricing: {},
          emergencyDefinition: industry.defaultEmergencyDefinition(region),
          businessHours: {},
          liveTransferEnabled: true,
          industry: industry.id,
          country: region.code,
          businessDescription: industry.id === "general" ? "a dog grooming salon" : null,
        });

        // No unfilled template values.
        expect(prompt).not.toMatch(/undefined|\bnull\b|\[object /);
        // Plumbing wording must not leak into other industries.
        if (industry.id !== "plumbing") expect(prompt).not.toMatch(/plumb/i);
        // The local emergency number is used, never another country's.
        expect(prompt).toContain(region.emergencyNumber);
        if (region.emergencyNumber !== "911") expect(prompt).not.toMatch(/\b911\b/);
        // Live transfer only where the industry allows it.
        expect(prompt.includes("transferCall")).toBe(industry.allowsLiveTransfer);
        // 10 instructions + 6 booking-flow steps, numbered consistently.
        expect(prompt.match(/^\d+\. /gm)).toHaveLength(16);
        // Health and confidential industries always carry guardrails.
        if (industry.sensitivity !== "standard") expect(prompt).toContain("BOUNDARIES");
      });
    }
  }
});

describe("prompt options", () => {
  const base: PromptConfig = {
    businessName: "Acme",
    ownerName: "Sam",
    serviceArea: "Town",
    timezone: "America/New_York",
    calendarType: "manual",
    appointmentDurationMinutes: 60,
    servicesOffered: [],
    pricing: { serviceCallFee: "", hourlyRate: "  " },
    emergencyDefinition: "x",
    businessHours: {},
  };

  it("uses the business's own description when given", () => {
    const prompt = buildAgentPrompt({ ...base, industry: "general", businessDescription: "a dog grooming salon" });
    expect(prompt).toContain("Acme, a dog grooming salon serving Town");
  });

  it("never reads out a blank price", () => {
    const prompt = buildAgentPrompt(base);
    expect(prompt).toContain("- Service call fee: Call for quote");
    expect(prompt).toContain("- Hourly rate: Call for quote");
  });

  it("omits the pricing section when the industry has no pricing fields", () => {
    expect(buildAgentPrompt({ ...base, industry: "insurance" })).not.toContain("PRICING:");
  });

  it("only activates live transfer when enabled and allowed", () => {
    expect(isLiveTransferActive({ ...base, liveTransferEnabled: true })).toBe(true);
    expect(isLiveTransferActive({ ...base, liveTransferEnabled: false })).toBe(false);
    expect(isLiveTransferActive({ ...base, liveTransferEnabled: true, industry: "clinic" })).toBe(false);
  });
});
