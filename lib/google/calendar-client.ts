import { auth, calendar, type calendar_v3 } from "@googleapis/calendar";

// Initialises a Google Calendar API client using service-account credentials.
// Each customer shares their calendar with GOOGLE_SERVICE_ACCOUNT_EMAIL, so no
// per-client OAuth/token storage is needed.
//
// Uses @googleapis/calendar (Calendar API only) rather than the full `googleapis`
// meta-package — far smaller, so cold starts (dev compile + serverless import)
// stay well under Vapi's 20s tool timeout.
export function getCalendarClient(): calendar_v3.Calendar {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!clientEmail || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are not set"
    );
  }

  const authClient = new auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      // Vercel stores newlines as literal "\n" — convert back to real newlines.
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return calendar({ version: "v3", auth: authClient });
}
