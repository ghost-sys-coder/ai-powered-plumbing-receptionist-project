import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import {
  decryptSecret,
  encryptSecret,
  isEncryptionConfigured,
  signValue,
  verifySignature,
} from "./secret-box";

describe("secret-box", () => {
  beforeEach(() => vi.stubEnv("TOKEN_ENCRYPTION_KEY", crypto.randomBytes(32).toString("base64")));
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips a secret and never returns the plaintext in the ciphertext", () => {
    const secret = "1//0refresh-token-value";
    const box = encryptSecret(secret);
    expect(box.startsWith("v1.")).toBe(true);
    expect(box).not.toContain(secret);
    expect(decryptSecret(box)).toBe(secret);
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects tampered ciphertext", () => {
    const parts = encryptSecret("secret").split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });

  it("can't decrypt with a different key", () => {
    const box = encryptSecret("secret");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", crypto.randomBytes(32).toString("base64"));
    expect(() => decryptSecret(box)).toThrow();
  });

  it("signs and verifies values", () => {
    const sig = signValue("payload");
    expect(verifySignature("payload", sig)).toBe(true);
    expect(verifySignature("payload2", sig)).toBe(false);
    expect(verifySignature("payload", "short")).toBe(false);
  });

  it("reports when the key is missing or the wrong size", () => {
    expect(isEncryptionConfigured()).toBe(true);
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", Buffer.from("too short").toString("base64"));
    expect(isEncryptionConfigured()).toBe(false);
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
    expect(isEncryptionConfigured()).toBe(false);
  });
});
