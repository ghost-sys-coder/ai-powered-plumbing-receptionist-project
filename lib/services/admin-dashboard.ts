import { db } from "@/db/drizzle";
import { customers, vapiAgents, calls, bookings } from "@/db/schema";
import { eq, desc, count, gte, and } from "drizzle-orm";

export async function getAllCustomers() {
  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);

  const customerList = await db.select().from(customers).orderBy(desc(customers.createdAt));

  const callCounts = await db
    .select({ customerId: calls.customerId, count: count() })
    .from(calls)
    .where(gte(calls.startedAt, since7d))
    .groupBy(calls.customerId);

  const countMap = new Map(callCounts.map((r) => [r.customerId, r.count]));

  return customerList.map((c) => ({
    ...c,
    callsLast7d: countMap.get(c.id) ?? 0,
  }));
}

export async function getCustomerStats() {
  const all = await db
    .select({ status: customers.status, count: count() })
    .from(customers)
    .groupBy(customers.status);

  const map = new Map(all.map((r) => [r.status, r.count]));
  return {
    total: Array.from(map.values()).reduce((a, b) => a + b, 0),
    active: map.get("active") ?? 0,
    onboarding: map.get("onboarding") ?? 0,
    churned: map.get("churned") ?? 0,
  };
}

export async function getCustomerDetail(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) return null;

  const [agent] = await db
    .select()
    .from(vapiAgents)
    .where(eq(vapiAgents.customerId, id))
    .limit(1);

  const recentCalls = await db
    .select()
    .from(calls)
    .where(eq(calls.customerId, id))
    .orderBy(desc(calls.startedAt))
    .limit(10);

  const upcomingBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.customerId, id))
    .orderBy(bookings.scheduledAt)
    .limit(5);

  return { customer, agent: agent ?? null, recentCalls, upcomingBookings };
}
