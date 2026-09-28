import { db } from "@/db/drizzle";
import { calls, bookings, vapiAgents } from "@/db/schema";
import { eq, and, gte, desc, count, sql } from "drizzle-orm";
import { DateTime } from "luxon";

// "Today" and "this week" are measured in the business's own timezone, not the
// server's (Vercel runs in UTC). Luxon weeks start on Monday.
function periodStarts(timezone: string) {
  let now = DateTime.now().setZone(timezone);
  if (!now.isValid) now = DateTime.now().setZone("UTC");
  return {
    todayStart: now.startOf("day").toJSDate(),
    weekStart: now.startOf("week").toJSDate(),
  };
}

// All four stat cards come from one query: a single pass over this week's
// calls, with FILTER clauses splitting out each count.
export async function getDashboardStats(customerId: string, timezone: string) {
  const { todayStart, weekStart } = periodStarts(timezone);

  const [row] = await db
    .select({
      callsToday: sql<number>`count(*) filter (where ${calls.startedAt} >= ${todayStart.toISOString()})`.mapWith(Number),
      callsThisWeek: count(),
      bookedThisWeek: sql<number>`count(*) filter (where ${calls.outcome} = 'booked')`.mapWith(Number),
      missedThisWeek: sql<number>`count(*) filter (where ${calls.outcome} in ('dropped', 'abandoned'))`.mapWith(Number),
    })
    .from(calls)
    .where(and(eq(calls.customerId, customerId), gte(calls.startedAt, weekStart)));

  return {
    callsToday: row?.callsToday ?? 0,
    callsThisWeek: row?.callsThisWeek ?? 0,
    bookedThisWeek: row?.bookedThisWeek ?? 0,
    missedThisWeek: row?.missedThisWeek ?? 0,
  };
}

export async function getOwnerName(customerId: string) {
  const [agent] = await db.select({ ownerName: vapiAgents.ownerName }).from(vapiAgents)
    .where(eq(vapiAgents.customerId, customerId))
    .limit(1);
  return agent?.ownerName ?? null;
}

export async function getRecentCalls(customerId: string, limit = 5) {
  return db.select().from(calls)
    .where(eq(calls.customerId, customerId))
    .orderBy(desc(calls.startedAt))
    .limit(limit);
}

export type CallFilters = {
  outcome?: string;
  urgency?: string;
  dateRange?: string;
  page?: number;
};

export async function getCallsPage(customerId: string, filters: CallFilters) {
  const PAGE_SIZE = 20;
  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  const where = [eq(calls.customerId, customerId)];

  if (filters.outcome && filters.outcome !== "all") {
    where.push(eq(calls.outcome, filters.outcome as "booked" | "message_taken" | "transferred" | "dropped" | "abandoned"));
  }
  if (filters.urgency && filters.urgency !== "all") {
    where.push(eq(calls.urgencyLevel, filters.urgency as "emergency" | "urgent" | "routine" | "unknown"));
  }
  if (filters.dateRange && filters.dateRange !== "all") {
    const days = filters.dateRange === "week" ? 7 : filters.dateRange === "30d" ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    where.push(gte(calls.startedAt, since));
  }

  const [rows, totalResult] = await Promise.all([
    db.select().from(calls)
      .where(and(...where))
      .orderBy(desc(calls.startedAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ count: count() }).from(calls).where(and(...where)),
  ]);

  return {
    calls: rows,
    total: totalResult[0]?.count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.ceil((totalResult[0]?.count ?? 0) / PAGE_SIZE),
  };
}

export async function getCallWithBooking(customerId: string, callId: string) {
  const [call] = await db.select().from(calls)
    .where(and(eq(calls.customerId, customerId), eq(calls.id, callId)))
    .limit(1);

  if (!call) return null;

  const [booking] = await db.select().from(bookings)
    .where(eq(bookings.callId, call.id))
    .limit(1);

  return { call, booking: booking ?? null };
}

export async function getAgentConfig(customerId: string) {
  const [agent] = await db.select().from(vapiAgents)
    .where(eq(vapiAgents.customerId, customerId))
    .limit(1);
  return agent ?? null;
}
