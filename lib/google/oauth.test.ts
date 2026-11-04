import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decodeState,
  emailFromIdToken,
  encodeState,
  isGoogleOAuthConfigured,
  oauthRedirectUri,
  safeReturnPath,
} from "./oauth";

const NOW = 1_800_000_000_000;
const state = { customerId: "c1", returnTo: "/dashboard/agent", nonce: "n1", exp: NOW + 60_000 };

beforeEach(() => vi.stubEnv("TOKEN_ENCRYPTION_KEY", crypto.randomBytes(32).toString("base64")));
afterEach(() => vi.unstubAllEnvs());

describe("OAuth state", () => {
  it("round-trips a valid state", () => {
    expect(decodeState(encodeState(state), NOW)).toEqual(state);
  });

  it("rejects expired, tampered, unsigned or missing state", () => {
    expect(decodeState(encodeState(state), NOW + 120_000)).toBeNull();
    const [body, sig] = encodeState(state).split(".");
    const forged = Buffer.from(JSON.stringify({ ...state, customerId: "someone-else" })).toString("base64url");
    expect(decodeState(`${forged}.${sig}`, NOW)).toBeNull();
    expect(decodeState(body, NOW)).toBeNull();
    expect(decodeState(null, NOW)).toBeNull();
  });

  it("rejects states signed with another key", () => {
    const raw = encodeState(state);
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", crypto.randomBytes(32).toString("base64"));
    expect(decodeState(raw, NOW)).toBeNull();
  });

  it("rejects off-site return paths even when signed", () => {
    expect(decodeState(encodeState({ ...state, returnTo: "https://evil.example" }), NOW)).toBeNull();
  });
});

describe("safeReturnPath", () => {
  it("allows same-origin paths only", () => {
    expect(safeReturnPath("/admin/customers/1")).toBe(true);
    expect(safeReturnPath("//evil.example")).toBe(false);
    expect(safeReturnPath("https://evil.example")).toBe(false);
    expect(safeReturnPath("/\\evil.example")).toBe(false);
    expect(safeReturnPath(undefined)).toBe(false);
  });
});

describe("configuration", () => {
  it("is off until client id, secret, app URL and encryption key are all set", () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example/");
    expect(isGoogleOAuthConfigured()).toBe(false);
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
    expect(isGoogleOAuthConfigured()).toBe(true);
    expect(oauthRedirectUri()).toBe("https://app.example/api/integrations/google/callback");
  });
});

describe("emailFromIdToken", () => {
  it("reads the email claim and tolerates junk", () => {
    const payload = Buffer.from(JSON.stringify({ email: "owner@example.com" })).toString("base64url");
    expect(emailFromIdToken(`h.${payload}.s`)).toBe("owner@example.com");
    expect(emailFromIdToken("garbage")).toBeNull();
    expect(emailFromIdToken(null)).toBeNull();
  });
});
