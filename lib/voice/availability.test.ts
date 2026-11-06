import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/drizzle", () => ({ db: {} }));

import { elevenLabsAllowed } from "./availability";

describe("ElevenLabs availability", () => {
  it("is off for everyone without a key", () => {
    expect(elevenLabsAllowed({ configured: false, viewerKind: "platform", forAgencies: true })).toBe(false);
  });

  it("is always on for platform admins, so they can test", () => {
    expect(elevenLabsAllowed({ configured: true, viewerKind: "platform", forAgencies: false })).toBe(true);
  });

  it("follows the switch for agency staff", () => {
    expect(elevenLabsAllowed({ configured: true, viewerKind: "agency", forAgencies: false })).toBe(false);
    expect(elevenLabsAllowed({ configured: true, viewerKind: "agency", forAgencies: true })).toBe(true);
  });
});
