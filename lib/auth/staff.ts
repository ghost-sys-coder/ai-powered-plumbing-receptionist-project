import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { customers, users } from "@/db/schema";
import type { AppRole } from "./roles";

export { homeForRole, isStaffRole, type AppRole } from "./roles";

// Who is using the admin console, and what they may see.
//   platform — us: every agency and customer.
//   agency   — staff of one agency: only that agency's customers.
//
// The role comes from Clerk publicMetadata (session claims); agency membership
// comes from our users table, so a stale session token can't widen access.
export type StaffViewer =
  | { kind: "platform"; clerkId: string }
  | { kind: "agency"; clerkId: string; organizationId: string };

type RoleClaims = { role?: AppRole } | undefined;

export function roleFromClaims(sessionClaims: unknown): AppRole | undefined {
  return ((sessionClaims as { metadata?: RoleClaims } | null)?.metadata as RoleClaims)?.role;
}

async function resolveStaff(clerkId: string, role: AppRole | undefined): Promise<StaffViewer | null> {
  if (role === "admin") return { kind: "platform", clerkId };
  if (role !== "agency") return null;

  const [row] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(and(eq(users.clerkId, clerkId), eq(users.role, "agency"), isNull(users.deletedAt)))
    .limit(1);

  return row?.organizationId ? { kind: "agency", clerkId, organizationId: row.organizationId } : null;
}

// For admin pages and API routes: platform admins and agency staff.
export async function requireStaff(): Promise<StaffViewer> {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  const viewer = await resolveStaff(userId, roleFromClaims(sessionClaims));
  if (!viewer) redirect("/dashboard");
  return viewer;
}

// For platform-only actions: managing agencies, seeding demo data.
export async function requirePlatformAdmin(): Promise<StaffViewer & { kind: "platform" }> {
  const viewer = await requireStaff();
  if (viewer.kind !== "platform") redirect("/admin");
  return viewer;
}

// Non-redirecting variant for routes shared with clients (e.g. recordings).
export async function getStaffViewer(): Promise<StaffViewer | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  return resolveStaff(userId, roleFromClaims(sessionClaims));
}

// WHERE clause limiting `customers` to what the viewer may see. Undefined for
// platform admins (no restriction).
export function customerScope(viewer: StaffViewer): SQL | undefined {
  return viewer.kind === "platform" ? undefined : eq(customers.organizationId, viewer.organizationId);
}

// True when the viewer may act on this customer. Callers return 404 (not 403)
// on false, so customer ids from other agencies aren't confirmed.
export async function canAccessCustomer(viewer: StaffViewer, customerId: string): Promise<boolean> {
  const scope = customerScope(viewer);
  const [row] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(scope ? and(eq(customers.id, customerId), scope) : eq(customers.id, customerId))
    .limit(1);
  return !!row;
}

export function customerNotFound(): Response {
  return Response.json({ error: "Customer not found" }, { status: 404 });
}
