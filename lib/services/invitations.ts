import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/drizzle";
import { customers, users, pendingInvites } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type InviteResult =
  | { ok: true }
  | { ok: false; status: 400 | 404; error: string };

export async function sendCustomerInvite(customerId: string): Promise<InviteResult> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customer) {
    return { ok: false, status: 404, error: "Customer not found" };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.customerId, customerId), isNull(users.deletedAt)))
    .limit(1);

  if (existing) {
    return { ok: false, status: 400, error: "Customer already has an active login" };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!appUrl) {
    return {
      ok: false,
      status: 400,
      error: "NEXT_PUBLIC_APP_URL is not set — add it to your environment variables",
    };
  }

  try {
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: customer.email,
      publicMetadata: {
        role: "client",
        customer_id: customer.id,
      },
      redirectUrl: `${appUrl}/dashboard`,
      notify: true,
    });
  } catch (err: unknown) {
    const clerkErr = err as { errors?: Array<{ code?: string }> };
    if (clerkErr?.errors?.[0]?.code === "already_invited") {
      return { ok: false, status: 400, error: "Invitation already sent to this email" };
    }
    throw err;
  }

  // Store email → customer_id in our own DB so the webhook can reliably
  // look it up regardless of Clerk metadata propagation timing.
  await db
    .insert(pendingInvites)
    .values({ email: customer.email, customerId: customer.id })
    .onConflictDoUpdate({
      target: pendingInvites.email,
      set: { customerId: customer.id, createdAt: new Date() },
    });

  return { ok: true };
}
