import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, decodeState, emailFromIdToken } from "@/lib/google/oauth";
import { canManageCustomerCalendar, saveGoogleConnection } from "@/lib/services/calendar-connections";

const NONCE_COOKIE = "gcal_oauth_nonce";

// Google redirects here after consent. Verifies the signed state and the
// browser's nonce cookie, re-checks access, stores the encrypted refresh token
// and switches the receptionist to live booking.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = decodeState(params.get("state"));
  const fallback = "/dashboard/agent";

  const finish = (path: string, result: string) => {
    const url = new URL(path, req.nextUrl.origin);
    url.searchParams.set("calendar", result);
    const res = NextResponse.redirect(url);
    res.cookies.delete({ name: NONCE_COOKIE, path: "/api/integrations/google" });
    return res;
  };

  if (!state || state.nonce !== req.cookies.get(NONCE_COOKIE)?.value) {
    return finish(state?.returnTo ?? fallback, "expired");
  }
  if (params.get("error")) {
    // e.g. access_denied when the user cancels on Google's screen.
    return finish(state.returnTo, "cancelled");
  }
  if (!(await canManageCustomerCalendar(state.customerId))) {
    return finish(fallback, "error");
  }

  const code = params.get("code");
  if (!code) return finish(state.returnTo, "error");

  try {
    const { tokens } = await createOAuthClient().getToken(code);
    if (!tokens.refresh_token) {
      console.error("[calendar] Google returned no refresh token");
      return finish(state.returnTo, "error");
    }
    await saveGoogleConnection(state.customerId, {
      refreshToken: tokens.refresh_token,
      accountEmail: emailFromIdToken(tokens.id_token),
      scope: tokens.scope ?? null,
    });
    return finish(state.returnTo, "connected");
  } catch (err) {
    console.error("[calendar] connection failed:", (err as Error).message);
    return finish(state.returnTo, "error");
  }
}
