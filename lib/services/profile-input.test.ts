import { describe, expect, it } from "vitest";
import { parseProfileInput, storedProfile } from "./profile-input";

describe("parseProfileInput", () => {
  it("defaults to plumbing / US when nothing is sent", () => {
    expect(parseProfileInput({})).toEqual({
      ok: true,
      value: { industry: "plumbing", country: "US", businessDescription: null },
    });
  });

  it("accepts a valid industry, country and description", () => {
    const result = parseProfileInput({
      industry: "legal",
      country: "GB",
      businessDescription: "  a family law firm  ",
    });
    expect(result).toEqual({
      ok: true,
      value: { industry: "legal", country: "GB", businessDescription: "a family law firm" },
    });
  });

  it("rejects unknown industries and countries instead of defaulting", () => {
    expect(parseProfileInput({ industry: "dentist" }).ok).toBe(false);
    expect(parseProfileInput({ country: "UK" }).ok).toBe(false);
  });

  it("requires a description for the general industry", () => {
    expect(parseProfileInput({ industry: "general" }).ok).toBe(false);
    expect(parseProfileInput({ industry: "general", businessDescription: "   " }).ok).toBe(false);
    expect(
      parseProfileInput({ industry: "general", businessDescription: "a dog grooming salon" }).ok
    ).toBe(true);
  });

  it("limits description length", () => {
    expect(parseProfileInput({ businessDescription: "a".repeat(121) }).ok).toBe(false);
  });
});

describe("storedProfile", () => {
  it("falls back to defaults for unexpected stored values", () => {
    expect(storedProfile({ industry: "bogus", country: null })).toEqual({
      industry: "plumbing",
      country: "US",
      businessDescription: null,
    });
  });
});
