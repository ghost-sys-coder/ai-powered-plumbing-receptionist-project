import crypto from "node:crypto";

// Symmetric encryption for secrets we must store (OAuth refresh tokens, and
// later agencies' own provider API keys). AES-256-GCM with a random IV;
// output is "v1.<iv>.<tag>.<ciphertext>" in base64url.
//
// TOKEN_ENCRYPTION_KEY: 32 random bytes, base64-encoded. Generate with
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Rotating it makes existing ciphertexts unreadable (connections must be
// re-made), so keep it stable.

const VERSION = "v1";

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return buf;
}

export function isEncryptionConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("Unrecognised secret format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

// HMAC-SHA256 signature (base64url) with a key derived from the encryption key,
// for short-lived signed values such as OAuth `state`.
export function signValue(value: string): string {
  const macKey = crypto.createHmac("sha256", key()).update("signing-key-v1").digest();
  return crypto.createHmac("sha256", macKey).update(value).digest("base64url");
}

export function verifySignature(value: string, signature: string): boolean {
  const expected = Buffer.from(signValue(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
