import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { users, type NewUser } from "@/db/schema";

export type ClerkUserPayload = {
  id: string;
  email_addresses: Array<{ id: string; email_address: string }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  public_metadata?: { role?: string; customer_id?: string };
};

function primaryEmail(payload: ClerkUserPayload): string {
  const primary = payload.email_addresses.find(
    (e) => e.id === payload.primary_email_address_id
  );
  const email = primary?.email_address ?? payload.email_addresses[0]?.email_address;
  if (!email) {
    throw new Error(`Clerk user ${payload.id} has no email address`);
  }
  return email;
}

function fullName(payload: ClerkUserPayload): string | null {
  const name = [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}

// What a pending invite links the new user to.
export type InviteLink =
  | { role: "client"; customerId: string }
  | { role: "agency"; organizationId: string };

export async function syncClerkUserCreated(
  payload: ClerkUserPayload,
  link: InviteLink | null = null
): Promise<void> {
  const row: NewUser = {
    clerkId: payload.id,
    email: primaryEmail(payload),
    name: fullName(payload),
    role: link?.role ?? "client",
    customerId: link?.role === "client" ? link.customerId : undefined,
    organizationId: link?.role === "agency" ? link.organizationId : undefined,
  };

  try {
    if (link) {
      // user.updated can arrive first and insert a bare row; the invite link
      // must still apply, so update on conflict instead of ignoring it.
      await db
        .insert(users)
        .values(row)
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            role: row.role,
            customerId: row.customerId ?? null,
            organizationId: row.organizationId ?? null,
          },
        });
    } else {
      await db.insert(users).values(row).onConflictDoNothing({ target: users.clerkId });
    }
  } catch (err) {
    throw new Error(
      `Failed to insert user for clerk_id ${payload.id}: ${(err as Error).message}`
    );
  }
}

export async function syncClerkUserUpdated(payload: ClerkUserPayload): Promise<void> {
  const email = primaryEmail(payload);
  const name = fullName(payload);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, payload.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      clerkId: payload.id,
      email,
      name,
      role: "client",
    });
    return;
  }

  await db
    .update(users)
    .set({ email, name })
    .where(eq(users.clerkId, payload.id));
}

export async function softDeleteClerkUser(clerkId: string): Promise<void> {
  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.clerkId, clerkId));
}
