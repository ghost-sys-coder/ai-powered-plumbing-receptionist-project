import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/drizzle";
import { customers, users, pendingInvites } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type InviteResult =
  | { ok: true }
  | { ok: false; status: 400 | 404; error: string; code?: string };

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
      redirectUrl: `${appUrl}/sign-up`,
      notify: true,
    });
  } catch (err: unknown) {
    const clerkErr = err as { errors?: Array<{ code?: string; longMessage?: string }> };
    const code = clerkErr?.errors?.[0]?.code;
    if (code === "already_invited" || code === "duplicate_record") {
      return {
        ok: false,
        status: 400,
        code: "duplicate_invitation",
        error: `There is already a pending invitation for ${customer.email}.`,
      };
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

// Backfill the Clerk role for a customer who already signed up but whose
// publicMetadata.role was never set (e.g. invited before the ticket flow fix).
export async function assignCustomerRole(customerId: string): Promise<InviteResult> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customer) {
    return { ok: false, status: 404, error: "Customer not found" };
  }

  const [linkedUser] = await db
    .select({ clerkId: users.clerkId })
    .from(users)
    .where(and(eq(users.customerId, customerId), isNull(users.deletedAt)))
    .limit(1);

  if (!linkedUser) {
    return {
      ok: false,
      status: 400,
      error: "Customer has no login account yet — send a login invite first.",
    };
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(linkedUser.clerkId, {
    publicMetadata: {
      role: "client",
      customer_id: customer.id,
    },
  });

  // Keep our own DB row in sync.
  await db
    .update(users)
    .set({ role: "client" })
    .where(eq(users.clerkId, linkedUser.clerkId));

  return { ok: true };
}

export async function revokeCustomerInvite(customerId: string): Promise<InviteResult> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customer) {
    return { ok: false, status: 404, error: "Customer not found" };
  }

  const client = await clerkClient();
  let cleared = false;

  // 1. Revoke any pending invitation for this email.
  const invResponse = await client.invitations.getInvitationList({ limit: 500 });
  const allInvitations = Array.isArray(invResponse) ? invResponse : (invResponse.data ?? []);
  const pendingInvitation = allInvitations.find(
    (inv) =>
      inv.emailAddress.toLowerCase() === customer.email.toLowerCase() &&
      inv.status === "pending"
  );
  if (pendingInvitation) {
    await client.invitations.revokeInvitation(pendingInvitation.id);
    console.log("[revoke] revoked pending invitation", pendingInvitation.id);
    cleared = true;
  }

  // 2. Clerk also blocks new invitations when a user account already exists for
  //    the email (accepted invite = Clerk account created). Delete that account.
  const userResponse = await client.users.getUserList({
    emailAddress: [customer.email],
  });
  const clerkUsers = Array.isArray(userResponse) ? userResponse : (userResponse.data ?? []);
  for (const clerkUser of clerkUsers) {
    await client.users.deleteUser(clerkUser.id);
    await db.delete(users).where(eq(users.clerkId, clerkUser.id));
    console.log("[revoke] deleted Clerk user", clerkUser.id);
    cleared = true;
  }

  // 3. Clean up our pending_invites table regardless.
  await db.delete(pendingInvites).where(eq(pendingInvites.email, customer.email));

  if (!cleared) {
    return {
      ok: false,
      status: 404,
      error: `Nothing to revoke for ${customer.email} — no pending invitation or Clerk account found.`,
    };
  }

  return { ok: true };
}
