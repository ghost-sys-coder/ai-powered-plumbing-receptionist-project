import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calendarConnections, users, vapiAgents } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret-box";
import { canAccessCustomer, getStaffViewer } from "@/lib/auth/staff";
import { createOAuthClient } from "@/lib/google/oauth";
import { syncCustomerReceptionist } from "@/lib/services/receptionist-sync";

export type CalendarConnectionSummary = { accountEmail: string | null; connectedAt: Date };

export async function getCalendarConnection(customerId: string): Promise<CalendarConnectionSummary | null> {
  const [row] = await db
    .select({ accountEmail: calendarConnections.accountEmail, createdAt: calendarConnections.createdAt })
    .from(calendarConnections)
    .where(eq(calendarConnections.customerId, customerId))
    .limit(1);
  return row ? { accountEmail: row.accountEmail, connectedAt: row.createdAt } : null;
}

// Who may connect or disconnect a business's calendar: staff with access to
// the customer, or the business's own signed-in user.
export async function canManageCustomerCalendar(customerId: string): Promise<boolean> {
  const staff = await getStaffViewer();
  if (staff) return canAccessCustomer(staff, customerId);

  const { userId } = await auth();
  if (!userId) return false;
  const [user] = await db
    .select({ customerId: users.customerId })
    .from(users)
    .where(and(eq(users.clerkId, userId), isNull(users.deletedAt)))
    .limit(1);
  return user?.customerId === customerId;
}

// Stores the connection and switches the receptionist to live booking on the
// account's primary calendar (its real schedule, so busy times are respected).
export async function saveGoogleConnection(
  customerId: string,
  input: { refreshToken: string; accountEmail: string | null; scope: string | null }
): Promise<void> {
  const refreshTokenEncrypted = encryptSecret(input.refreshToken);
  await db
    .insert(calendarConnections)
    .values({
      customerId,
      provider: "google",
      accountEmail: input.accountEmail,
      refreshTokenEncrypted,
      scope: input.scope,
    })
    .onConflictDoUpdate({
      target: calendarConnections.customerId,
      set: { accountEmail: input.accountEmail, refreshTokenEncrypted, scope: input.scope },
    });

  await db
    .update(vapiAgents)
    .set({ calendarType: "google_calendar", calendarId: "primary" })
    .where(eq(vapiAgents.customerId, customerId));

  await syncCustomerReceptionist(customerId);
}

// Removes the connection, revokes Google's grant (best effort) and switches the
// receptionist to taking booking requests as messages.
export async function disconnectGoogle(customerId: string): Promise<void> {
  const [row] = await db
    .select({ refreshTokenEncrypted: calendarConnections.refreshTokenEncrypted })
    .from(calendarConnections)
    .where(eq(calendarConnections.customerId, customerId))
    .limit(1);
  if (!row) return;

  try {
    await createOAuthClient().revokeToken(decryptSecret(row.refreshTokenEncrypted));
  } catch (err) {
    console.warn(`[calendar] token revoke failed for ${customerId}:`, (err as Error).message);
  }

  await db.delete(calendarConnections).where(eq(calendarConnections.customerId, customerId));
  await db
    .update(vapiAgents)
    .set({ calendarType: "manual", calendarId: null })
    .where(eq(vapiAgents.customerId, customerId));

  await syncCustomerReceptionist(customerId);
}
