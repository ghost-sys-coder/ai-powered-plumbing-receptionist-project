import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { users, customers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCustomerId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select({ customerId: users.customerId })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  return user?.customerId ?? null;
}

// Resolves the signed-in client's customer id AND business timezone in one query.
// Used by dashboard pages that render times, so bookings/calls show in the
// client's local time regardless of the viewer's browser.
export async function getCustomerContext(): Promise<
  { customerId: string; timezone: string } | null
> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [row] = await db
    .select({ customerId: users.customerId, timezone: customers.timezone })
    .from(users)
    .leftJoin(customers, eq(users.customerId, customers.id))
    .where(eq(users.clerkId, userId))
    .limit(1);

  if (!row?.customerId) return null;
  return { customerId: row.customerId, timezone: row.timezone ?? "America/New_York" };
}
