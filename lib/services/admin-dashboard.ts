import { db } from "@/db/drizzle";
import { customers, vapiAgents, calls, bookings, type Customer } from "@/db/schema";
import { eq, desc, count, gte } from "drizzle-orm";

// db.batch() sends all queries in a single HTTP round trip to Neon, instead of
// one request per query.

export async function getAllCustomers() {
  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);

  const [customerList, callCounts] = await db.batch([
    db.select().from(customers).orderBy(desc(customers.createdAt)),
    db
      .select({ customerId: calls.customerId, count: count() })
      .from(calls)
      .where(gte(calls.startedAt, since7d))
      .groupBy(calls.customerId),
  ]);

  const countMap = new Map(callCounts.map((r) => [r.customerId, r.count]));

  return customerList.map((c) => ({
    ...c,
    callsLast7d: countMap.get(c.id) ?? 0,
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

export async function getCustomerDetail(id: string) {
  const [[customer], [agent], recentCalls, upcomingBookings] = await db.batch([
    db.select().from(customers).where(eq(customers.id, id)).limit(1),
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

  if (!customer) return null;

  return { customer, agent: agent ?? null, recentCalls, upcomingBookings };
}
