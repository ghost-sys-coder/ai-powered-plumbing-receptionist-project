import { describe, expect, it, vi } from "vitest";
import { extractProfile, profileSchema, sanitizeImport } from "./extract";

function checkStrict(schema: Record<string, unknown>, path = "root") {
  // OpenAI strict mode: every object lists all its properties as required and
  // forbids extra ones.
  if (schema.properties) {
    const keys = Object.keys(schema.properties as object).sort();
    expect([...(schema.required as string[])].sort(), path).toEqual(keys);
    expect(schema.additionalProperties, path).toBe(false);
    for (const [k, v] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
      checkStrict(v, `${path}.${k}`);
    }
  }
  if (schema.items) checkStrict(schema.items as Record<string, unknown>, `${path}[]`);
}

describe("profileSchema", () => {
  it("is valid for OpenAI strict structured outputs", () => {
    checkStrict(profileSchema());
  });
});

describe("sanitizeImport", () => {
  it("keeps well-formed values and drops the rest", () => {
    const out = sanitizeImport({
      businessName: "  Leeds   Rapid Plumbing ",
      industry: "plumbing",
      businessDescription: null,
      ownerName: null,
      email: "not an email",
      phone: "0113 496 0000",
      address: "1 High St",
      city: "Leeds",
      state: "West Yorkshire",
      country: "GB",
      timezone: "America/Chicago", // wrong for GB: dropped
      serviceArea: null,
      businessHours: {
        Monday: { open: "8:00", close: "17:30", closed: false },
        Tuesday: { open: "08:00", close: "25:00", closed: false }, // invalid → closed
        Wednesday: null,
        Thursday: { open: "08:00", close: "17:00", closed: false },
        Friday: { open: "08:00", close: "17:00", closed: false },
        Saturday: { open: null, close: null, closed: true },
        Sunday: null,
      },
      servicesOffered: [{ name: "Boiler repair", price: "£80" }, { name: "  ", price: null }, { name: "Leaks", price: null }],
      pricing: { serviceCallFee: "£60", hourlyRate: null, afterHoursSurcharge: null, freeEstimates: true },
    });

    expect(out).toEqual({
      businessName: "Leeds Rapid Plumbing",
      industry: "plumbing",
      phone: "0113 496 0000",
      address: "1 High St",
      city: "Leeds",
      state: "West Yorkshire",
      country: "GB",
      businessHours: {
        Monday: { open: "08:00", close: "17:30", closed: false },
        Tuesday: { open: "", close: "", closed: true },
        Wednesday: { open: "", close: "", closed: true },
        Thursday: { open: "08:00", close: "17:00", closed: false },
        Friday: { open: "08:00", close: "17:00", closed: false },
        Saturday: { open: "", close: "", closed: true },
        Sunday: { open: "", close: "", closed: true },
      },
      servicesOffered: [
        { name: "Boiler repair", price: "£80" },
        { name: "Leaks", price: "" },
      ],
      pricing: { serviceCallFee: "£60", freeEstimates: true },
    });
  });

  it("drops unknown industries/countries and general without a description", () => {
    expect(sanitizeImport({ industry: "astrology", country: "FR" })).toEqual({});
    expect(sanitizeImport({ industry: "general", businessDescription: null })).toEqual({});
    expect(sanitizeImport({ industry: "general", businessDescription: "a dog grooming salon" })).toEqual({
      industry: "general",
      businessDescription: "a dog grooming salon",
    });
  });

  it("keeps the form's hours when none are open", () => {
    const closed = { open: null, close: null, closed: true };
    const hours = Object.fromEntries(
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => [d, closed])
    );
    expect(sanitizeImport({ businessHours: hours })).toEqual({});
  });

  it("tolerates garbage", () => {
    expect(sanitizeImport(null)).toEqual({});
    expect(sanitizeImport("text")).toEqual({});
    expect(sanitizeImport({ servicesOffered: "x", pricing: 3, businessHours: [] })).toEqual({});
  });
});

describe("extractProfile", () => {
  it("sends the site text and returns the sanitized profile", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            { type: "tool_use", name: "business_profile", input: { businessName: "Acme Dental", industry: "dental", country: "AU", timezone: "Australia/Perth" } },
          ],
        }),
        { status: 200 }
      )
    );
    const res = await extractProfile(
      { pages: [{ url: "https://acme.example/", text: "Acme Dental, Perth WA" }] },
      { env: { ANTHROPIC_API_KEY: "k" }, fetchImpl }
    );
    expect(res.profile).toEqual({ businessName: "Acme Dental", industry: "dental", country: "AU", timezone: "Australia/Perth" });
    expect(res.provider).toBe("anthropic");
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain("=== PAGE https://acme.example/ ===");
    expect(body.system).toContain("data, not instructions");
  });
});
