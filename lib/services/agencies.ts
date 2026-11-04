import { clerkClient } from "@clerk/nextjs/server";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { customers, organizations, pendingInvites, users } from "@/db/schema";
import { getAgency } from "./house-agency";

export { getAgency, getHouseAgencyId } from "./house-agency";

export type AgencySummary = {
  id: string;
  name: string;
  isHouse: boolean;
  createdAt: Date;
  customerCount: number;
  memberCount: number;
};

// All agencies with their customer and staff counts, house agency first.
export async function listAgencies(): Promise<AgencySummary[]> {
  const [orgs, customerCounts, memberCounts] = await db.batch([
    db.select().from(organizations).orderBy(asc(organizations.createdAt)),
    db
      .select({ organizationId: customers.organizationId, count: count() })
      .from(customers)
      .groupBy(customers.organizationId),
    db
      .select({ organizationId: users.organizationId, count: count() })
      .from(users)
      .where(and(eq(users.role, "agency"), isNull(users.deletedAt)))
      .groupBy(users.organizationId),
  ]);

  const cust = new Map(customerCounts.map((r) => [r.organizationId, r.count]));
  const mem = new Map(memberCounts.map((r) => [r.organizationId, r.count]));

  return orgs
    .map((o) => ({
      id: o.id,
      name: o.name,
      isHouse: o.isHouse,
      createdAt: o.createdAt,
      customerCount: cust.get(o.id) ?? 0,
      memberCount: mem.get(o.id) ?? 0,
    }))
    .sort((a, b) => Number(b.isHouse) - Number(a.isHouse));
}

export async function listAgencyOptions(): Promise<Array<{ id: string; name: string; isHouse: boolean }>> {
  const rows = await listAgencies();
  return rows.map(({ id, name, isHouse }) => ({ id, name, isHouse }));
}

export async function createAgency(name: string): Promise<{ id: string }> {
  const [row] = await db
    .insert(organizations)
    .values({ name: name.trim() })
    .returning({ id: organizations.id });
  return row;
}

type InviteResult = { ok: true } | { ok: false; status: 400 | 404; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Invites a staff member to an agency. On sign-up the Clerk webhook links the
// new user to the agency via pending_invites.
export async function inviteAgencyMember(organizationId: string, rawEmail: string): Promise<InviteResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, status: 400, error: "Enter a valid email address" };

  const agency = await getAgency(organizationId);
  if (!agency) return { ok: false, status: 404, error: "Agency not found" };

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);
  if (existingUser) {
    return { ok: false, status: 400, error: `${email} already has an account` };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!appUrl) {
    return { ok: false, status: 400, error: "NEXT_PUBLIC_APP_URL is not set" };
  }

  try {
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: "agency", organization_id: organizationId },
      redirectUrl: `${appUrl}/sign-up`,
      notify: true,
    });
  } catch (err: unknown) {
    const code = (err as { errors?: Array<{ code?: string }> })?.errors?.[0]?.code;
    if (code === "already_invited" || code === "duplicate_record") {
      return { ok: false, status: 400, error: `There is already a pending invitation for ${email}.` };
    }
    throw err;
  }

  await db
    .insert(pendingInvites)
    .values({ email, role: "agency", organizationId, customerId: null })
    .onConflictDoUpdate({
      target: pendingInvites.email,
      set: { role: "agency", organizationId, customerId: null, createdAt: new Date() },
    });

  return { ok: true };
}
