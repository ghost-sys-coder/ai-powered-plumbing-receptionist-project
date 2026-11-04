import { auth } from "@googleapis/calendar";
import { isEncryptionConfigured, signValue, verifySignature } from "@/lib/crypto/secret-box";

// One-click "Connect Google Calendar" (OAuth 2.0, offline access).
//
// Needs, in the environment:
//   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET — a "Web application"
//     OAuth client in Google Cloud with redirect URI
//     <NEXT_PUBLIC_APP_URL>/api/integrations/google/callback
//   TOKEN_ENCRYPTION_KEY — encrypts the stored refresh token
// Until all are set the connect button is hidden and the service-account flow
// is the only option.

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  // Full calendar scope: availability (freebusy), calendar metadata and
  // creating booking events all use it, exactly as the service account does.
  "https://www.googleapis.com/auth/calendar",
];

const STATE_TTL_MS = 15 * 60 * 1000;

export function isGoogleOAuthConfigured(): boolean {
  return (
    !!process.env.GOOGLE_OAUTH_CLIENT_ID &&
    !!process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    !!appUrl() &&
    isEncryptionConfigured()
  );
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export function oauthRedirectUri(): string {
  return `${appUrl()}/api/integrations/google/callback`;
}

export function createOAuthClient() {
  return new auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    oauthRedirectUri()
  );
}

export type OAuthState = {
  customerId: string;
  // Same-origin path to return to afterwards.
  returnTo: string;
  // Matches the httpOnly cookie set when the flow started (CSRF protection).
  nonce: string;
  exp: number;
};

export function encodeState(state: OAuthState): string {
  const body = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${body}.${signValue(body)}`;
}

// Verifies signature and expiry. Returns null for anything tampered or stale.
export function decodeState(raw: string | null, now = Date.now()): OAuthState | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig || !verifySignature(body, sig)) return null;
  try {
    const state = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthState;
    if (typeof state.exp !== "number" || state.exp < now) return null;
    if (!safeReturnPath(state.returnTo)) return null;
    return state;
  } catch {
    return null;
  }
}

export function newStateExpiry(now = Date.now()): number {
  return now + STATE_TTL_MS;
}

// Only same-origin absolute paths, so the callback can't be used as an open
// redirect.
export function safeReturnPath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

// Reads the email claim from a Google id_token. The token comes straight from
// Google's token endpoint over TLS, so it is used for display only, not trust.
export function emailFromIdToken(idToken: string | null | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}
