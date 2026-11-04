import { db } from "@/db/drizzle";
import {
  customers,
  vapiAgents,
  calls,
  bookings,
  organizations,
  type Customer,
} from "@/db/schema";
import { and, eq, desc, count, gte, inArray } from "drizzle-orm";
import { customerScope, type StaffViewer } from "@/lib/auth/staff";

// db.batch() sends all queries in a single HTTP round trip to Neon, instead of
// one request per query.

// Customers the viewer may see (all for platform admins, their own agency's
// for agency staff), with recent call counts and the owning agency's name.
export async function getAllCustomers(viewer: StaffViewer) {
  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);
  const scope = customerScope(viewer);

  const customerList = await db
    .select({ customer: customers, agencyName: organizations.name })
    .from(customers)
    .innerJoin(organizations, eq(customers.organizationId, organizations.id))
    .where(scope)
    .orderBy(desc(customers.createdAt));

  const ids = customerList.map((r) => r.customer.id);
  const callCounts = ids.length
    ? await db
        .select({ customerId: calls.customerId, count: count() })
        .from(calls)
        .where(and(inArray(calls.customerId, ids), gte(calls.startedAt, since7d)))
        .groupBy(calls.customerId)
    : [];

  const countMap = new Map(callCounts.map((r) => [r.customerId, r.count]));

  return customerList.map(({ customer, agencyName }) => ({
    ...customer,
    agencyName,
    callsLast7d: countMap.get(customer.id) ?? 0,
  }));
}

// Derived from the already-loaded customer list — no extra query needed.
export function summarizeCustomerStatuses(customerList: Pick<Customer, "status">[]) {
  const countOf = (status: Customer["status"]) =>
    customerList.filter((c) => c.status === status).length;

  return {
    total: customerList.length,
    active: countOf("active"),
    onboarding: countOf("onboarding"),
    churned: countOf("churned"),
  };
}

// One customer's detail, or null if it doesn't exist or the viewer may not see
// it (callers render 404 either way).
export async function getCustomerDetail(id: string, viewer: StaffViewer) {
  const scope = customerScope(viewer);
  const [[customer], [agent], recentCalls, upcomingBookings] = await db.batch([
    db
      .select()
      .from(customers)
      .where(scope ? and(eq(customers.id, id), scope) : eq(customers.id, id))
      .limit(1),
    db.select().from(vapiAgents).where(eq(vapiAgents.customerId, id)).limit(1),
    db
      .select()
      .from(calls)
      .where(eq(calls.customerId, id))
      .orderBy(desc(calls.startedAt))
      .limit(10),
    db
      .select()
      .from(bookings)
      .where(eq(bookings.customerId, id))
      .orderBy(bookings.scheduledAt)
      .limit(5),
  ]);

  // The other queries ran unscoped in the same round trip; their rows are only
  // returned when the customer itself passed the scope check.
  if (!customer) return null;

  return { customer, agent: agent ?? null, recentCalls, upcomingBookings };
}
