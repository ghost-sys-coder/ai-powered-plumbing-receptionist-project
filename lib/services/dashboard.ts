import { db } from "@/db/drizzle";
import { calls, bookings, vapiAgents } from "@/db/schema";
import { eq, and, gte, inArray, desc, count } from "drizzle-orm";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardStats(customerId: string) {
  const todayStart = startOfToday();
  const weekStart = startOfWeek();

  const [callsToday, callsThisWeek, bookedThisWeek, missedThisWeek] = await Promise.all([
    db.select({ count: count() }).from(calls)
      .where(and(eq(calls.customerId, customerId), gte(calls.startedAt, todayStart))),
    db.select({ count: count() }).from(calls)
      .where(and(eq(calls.customerId, customerId), gte(calls.startedAt, weekStart))),
    db.select({ count: count() }).from(calls)
      .where(and(eq(calls.customerId, customerId), gte(calls.startedAt, weekStart), eq(calls.outcome, "booked"))),
    db.select({ count: count() }).from(calls)
      .where(and(eq(calls.customerId, customerId), gte(calls.startedAt, weekStart), inArray(calls.outcome, ["dropped", "abandoned"]))),
  ]);

  return {
    callsToday: callsToday[0]?.count ?? 0,
    callsThisWeek: callsThisWeek[0]?.count ?? 0,
    bookedThisWeek: bookedThisWeek[0]?.count ?? 0,
    missedThisWeek: missedThisWeek[0]?.count ?? 0,
  };
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
