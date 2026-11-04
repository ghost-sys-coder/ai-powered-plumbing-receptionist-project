import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_CALENDAR_SCOPES,
  createOAuthClient,
  encodeState,
  isGoogleOAuthConfigured,
  newStateExpiry,
  safeReturnPath,
} from "@/lib/google/oauth";
import { canManageCustomerCalendar } from "@/lib/services/calendar-connections";

const NONCE_COOKIE = "gcal_oauth_nonce";

// Starts "Connect Google Calendar": checks access, then sends the browser to
// Google's consent screen. The callback finishes the connection.
export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId") ?? "";
  const returnToParam = req.nextUrl.searchParams.get("returnTo");
  const returnTo = safeReturnPath(returnToParam) ? returnToParam : "/dashboard/agent";

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json({ error: "Google Calendar connection isn't set up yet" }, { status: 503 });
  }
  if (!customerId || !(await canManageCustomerCalendar(customerId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nonce = crypto.randomBytes(16).toString("base64url");
  const url = createOAuthClient().generateAuthUrl({
    access_type: "offline",
    // Always show consent so Google returns a refresh token, even on reconnect.
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_CALENDAR_SCOPES,
    state: encodeState({ customerId, returnTo, nonce, exp: newStateExpiry() }),
  });

  const res = NextResponse.redirect(url);
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/integrations/google",
    maxAge: 15 * 60,
  });
  return res;
}
