import { auth, calendar, type calendar_v3 } from "@googleapis/calendar";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calendarConnections } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto/secret-box";
import { createOAuthClient } from "./oauth";

// Calendar API client for a customer.
//
// - If the business connected its Google account (one-click OAuth), use its
//   refresh token; Google access tokens are refreshed automatically.
// - Otherwise use the platform service account, which works for calendars the
//   business shared with GOOGLE_SERVICE_ACCOUNT_EMAIL (the original flow).
//
// Uses @googleapis/calendar (Calendar API only) rather than the full `googleapis`
// meta-package — far smaller, so cold starts (dev compile + serverless import)
// stay well under Vapi's 20s tool timeout.
export async function getCalendarClient(customerId?: string | null): Promise<calendar_v3.Calendar> {
  if (customerId) {
    const [connection] = await db
      .select({ refreshTokenEncrypted: calendarConnections.refreshTokenEncrypted })
      .from(calendarConnections)
      .where(eq(calendarConnections.customerId, customerId))
      .limit(1);
    if (connection) {
      const oauth = createOAuthClient();
      oauth.setCredentials({ refresh_token: decryptSecret(connection.refreshTokenEncrypted) });
      return calendar({ version: "v3", auth: oauth });
    }
  }
  return serviceAccountClient();
}

function serviceAccountClient(): calendar_v3.Calendar {
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
