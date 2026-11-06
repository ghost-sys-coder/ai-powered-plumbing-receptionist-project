import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/drizzle", () => ({ db: {} }));

import { callSummaryText, shouldTextSummary } from "./call-summary-text";

describe("call summary text", () => {
  it("reads like a short note", () => {
    expect(
      callSummaryText({
        businessName: "Harbourside Dental",
        outcome: "message_taken",
        callerName: "Dana Whitmore",
        callerPhone: "+61412557093",
        issueSummary: "Wants a cleaning next week",
        link: "https://x.test/dashboard/calls/1",
      })
    ).toBe(
      "Harbourside Dental: new call\nMessage taken\nFrom: Dana Whitmore +61412557093\nAbout: Wants a cleaning next week\nhttps://x.test/dashboard/calls/1"
    );
  });

  it("copes with missing details and clips long summaries", () => {
    const text = callSummaryText({
      businessName: "Hightower Plumbing",
      outcome: null,
      callerName: null,
      callerPhone: null,
      issueSummary: "x".repeat(400),
      link: "L",
    });
    expect(text).toContain("Call ended\nFrom: unknown\n");
    expect(text.split("\n")[3].length).toBeLessThanOrEqual(167);
  });

  it("skips calls already texted as emergencies, or with nothing to act on", () => {
    const base = { outcome: "message_taken", callerPhone: "+1", issueSummary: "x", ownerAlertedAt: null };
    expect(shouldTextSummary(base)).toBe(true);
    expect(shouldTextSummary({ ...base, ownerAlertedAt: new Date() })).toBe(false);
    expect(shouldTextSummary({ ...base, callerPhone: null, issueSummary: null })).toBe(false);
    expect(shouldTextSummary({ ...base, callerPhone: null })).toBe(true);
  });
});
