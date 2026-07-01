import { DateTime } from "luxon";
import { and, eq, gte, isNotNull, lt, ne } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { bookings } from "@/db/schema";
import { getCalendarClient } from "@/lib/google/calendar-client";

// Slot policy. Duration/buffer are per-customer (passed in); lead time and window
// are global for v1 — promote to per-customer later if needed.
const MIN_LEAD_MINUTES = 120;
const BOOKING_WINDOW_DAYS = 14;
const SLOT_INCREMENT_MINUTES = 30; // candidate starts land on :00 / :30
const MAX_SLOTS = 6;
const GOOGLE_TIMEOUT_MS = 8000; // bound each Google call well under Vapi's 20s tool timeout

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type DayHours = { open?: string; close?: string; closed?: boolean };
type BusinessHours = Record<string, DayHours>;

type BusyPeriod = { start: DateTime; end: DateTime };

export type TimeSlot = {
  start: Date;
  end: Date;
  startIso: string; // exact ISO with offset — the AI echoes this back to book
  label: string; // spoken form, e.g. "Thursday, July 3, 9:00 AM – 11:00 AM"
};

export type GetAvailableSlotsInput = {
  calendarId: string;
  durationMinutes: number;
  bufferMinutes: number;
  customerId: string;
  timezone: string;
  businessHours: unknown;
  fromDate?: Date;
  preferredTime?: string | null; // e.g. "2 PM", "afternoon", "14:00"
};

function parseBusinessHours(value: unknown): BusinessHours {
  return value && typeof value === "object" ? (value as BusinessHours) : {};
}

// Maps a spoken time preference to minutes-from-midnight, or null. Handles
// periods ("morning"/"afternoon"/"evening") and clock times ("2 PM", "14:00").
export function parseTimeOfDay(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  if (t.includes("morning")) return 9 * 60;
  if (t.includes("noon") || t.includes("midday")) return 12 * 60;
  if (t.includes("afternoon")) return 14 * 60;
  if (t.includes("evening") || t.includes("night")) return 17 * 60;

  const m = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/.exec(t);
  if (m) {
    let hour = Number(m[1]);
    const minute = Number(m[2] ?? "0");
    const ap = m[3]?.replace(/\./g, "");
    if (ap === "pm" && hour < 12) hour += 12;
    if (ap === "am" && hour === 12) hour = 0;
    if (hour <= 23 && minute <= 59) return hour * 60 + minute;
  }
  return null;
}

// Maps a caller's spoken preference ("Thursday", "tomorrow", "next week") to a
// start date in the customer's timezone. Returns undefined to mean "from now".
export function parsePreferredDate(
  text: string | undefined,
  timezone: string
): Date | undefined {
  if (!text) return undefined;
  const t = text.trim().toLowerCase();
  const today = DateTime.now().setZone(timezone || "America/New_York").startOf("day");

  if (t.includes("today")) return today.toJSDate();
  if (t.includes("tomorrow")) return today.plus({ days: 1 }).toJSDate();

  // A weekday name takes priority over "next week", so "Monday next week" and
  // "next Monday" resolve to a Monday (not 7 days from today).
  // luxon weekday: Monday=1 … Sunday=7
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (let i = 0; i < days.length; i++) {
    if (t.includes(days[i])) {
      const target = i + 1;
      let diff = (target - today.weekday + 7) % 7;
      if (diff === 0) diff = 7; // bare weekday matching today → the next occurrence
      return today.plus({ days: diff }).toJSDate();
    }
  }

  if (t.includes("next week")) return today.plus({ days: 7 }).toJSDate();
  return undefined;
}

// Formats an instant in the customer's timezone for reading back to the caller.
export function formatSlotLabel(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date)
    .setZone(timezone || "America/New_York")
    .toFormat("cccc, LLLL d 'at' h:mm a");
}

// "08:00" -> { hour: 8, minute: 0 }; null if unparseable/empty.
function parseHhMm(value: string | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

// Google freebusy busy periods for the calendar within [start, end].
async function fetchGoogleBusy(
  calendarId: string,
  start: DateTime,
  end: DateTime
): Promise<BusyPeriod[]> {
  const calendar = getCalendarClient();
  const res = await calendar.freebusy.query(
    {
      requestBody: {
        timeMin: start.toISO() ?? undefined,
        timeMax: end.toISO() ?? undefined,
        items: [{ id: calendarId }],
      },
    },
    { timeout: GOOGLE_TIMEOUT_MS }
  );
  const busy = res.data.calendars?.[calendarId]?.busy ?? [];
  return busy
    .filter((b) => b.start && b.end)
    .map((b) => ({
      start: DateTime.fromISO(b.start as string),
      end: DateTime.fromISO(b.end as string),
    }));
}

// Confirmed bookings in our DB for this customer within the window — belt and
// suspenders against DB/calendar drift.
async function fetchDbBusy(
  customerId: string,
  durationMinutes: number,
  start: DateTime,
  end: DateTime
): Promise<BusyPeriod[]> {
  const rows = await db
    .select({ scheduledAt: bookings.scheduledAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.customerId, customerId),
        ne(bookings.status, "cancelled"),
        isNotNull(bookings.scheduledAt),
        gte(bookings.scheduledAt, start.toJSDate()),
        lt(bookings.scheduledAt, end.toJSDate())
      )
    );

  return rows
    .filter((r) => r.scheduledAt)
    .map((r) => {
      const s = DateTime.fromJSDate(r.scheduledAt as Date);
      return { start: s, end: s.plus({ minutes: durationMinutes }) };
    });
}

function overlapsBusy(
  slotStart: DateTime,
  slotEndWithBuffer: DateTime,
  busy: BusyPeriod[]
): boolean {
  return busy.some((b) => slotStart < b.end && slotEndWithBuffer > b.start);
}

export async function getAvailableSlots(
  input: GetAvailableSlotsInput
): Promise<TimeSlot[]> {
  try {
    const zone = input.timezone || "America/New_York";
    const hours = parseBusinessHours(input.businessHours);

    const now = input.fromDate
      ? DateTime.fromJSDate(input.fromDate).setZone(zone)
      : DateTime.now().setZone(zone);
    const earliest = now.plus({ minutes: MIN_LEAD_MINUTES });
    const windowStart = now.startOf("day");
    const windowEnd = now.plus({ days: BOOKING_WINDOW_DAYS }).endOf("day");

    const [googleBusy, dbBusy] = await Promise.all([
      fetchGoogleBusy(input.calendarId, windowStart, windowEnd),
      fetchDbBusy(input.customerId, input.durationMinutes, windowStart, windowEnd),
    ]);
    const busy = [...googleBusy, ...dbBusy];

    const targetMin = parseTimeOfDay(input.preferredTime);

    // Collect every open candidate, tagged with its day offset and minute-of-day
    // so we can rank them: soonest day first, and — when the caller stated a
    // preferred time — closest to that time within each day.
    type Candidate = { slot: TimeSlot; dayOffset: number; minOfDay: number };
    const candidates: Candidate[] = [];

    for (let dayOffset = 0; dayOffset < BOOKING_WINDOW_DAYS; dayOffset++) {
      const day = now.plus({ days: dayOffset }).startOf("day");
      const dayHours = hours[DAY_NAMES[day.weekday % 7]];
      if (!dayHours || dayHours.closed) continue;

      const open = parseHhMm(dayHours.open);
      const close = parseHhMm(dayHours.close);
      if (!open || !close) continue;

      let cursor = day.set({ hour: open.hour, minute: open.minute });
      const dayClose = day.set({ hour: close.hour, minute: close.minute });

      while (cursor.plus({ minutes: input.durationMinutes }) <= dayClose) {
        const slotStart = cursor;
        const slotEnd = cursor.plus({ minutes: input.durationMinutes });
        const slotEndWithBuffer = slotEnd.plus({ minutes: input.bufferMinutes });

        const tooSoon = slotStart < earliest;
        if (!tooSoon && !overlapsBusy(slotStart, slotEndWithBuffer, busy)) {
          candidates.push({
            dayOffset,
            minOfDay: slotStart.hour * 60 + slotStart.minute,
            slot: {
              start: slotStart.toJSDate(),
              end: slotEnd.toJSDate(),
              startIso: slotStart.toISO() ?? slotStart.toJSDate().toISOString(),
              label: `${slotStart.toFormat("cccc, LLLL d")}, ${slotStart.toFormat(
                "h:mm a"
              )} – ${slotEnd.toFormat("h:mm a")}`,
            },
          });
        }

        cursor = cursor.plus({ minutes: SLOT_INCREMENT_MINUTES });
      }

      // Once we have enough candidates on/after the requested day to rank, stop.
      if (candidates.length >= 40) break;
    }

    candidates.sort((a, b) => {
      if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset;
      if (targetMin != null) {
        return Math.abs(a.minOfDay - targetMin) - Math.abs(b.minOfDay - targetMin);
      }
      return a.minOfDay - b.minOfDay;
    });

    return candidates.slice(0, MAX_SLOTS).map((c) => c.slot);
  } catch (err) {
    console.error("[calendar-availability] getAvailableSlots failed", err);
    return [];
  }
}

export type BookSlotInput = {
  calendarId: string;
  customerId: string;
  vapiAgentId: string;
  callId: string; // resolved internal calls.id — satisfies bookings.call_id NOT NULL
  slot: { start: Date; end: Date };
  callerName: string | null;
  callerPhone: string | null;
  issueSummary: string | null;
  serviceAddress: string | null;
};

export type BookSlotResult = {
  success: boolean;
  calendarEventId: string | null;
  scheduledAt: Date;
  error?: string;
};

export async function bookSlot(input: BookSlotInput): Promise<BookSlotResult> {
  const start = DateTime.fromJSDate(input.slot.start);
  const end = DateTime.fromJSDate(input.slot.end);

  try {
    // 1. Targeted collision re-check for exactly this slot (Google + DB).
    const [googleBusy, dbBusy] = await Promise.all([
      fetchGoogleBusy(input.calendarId, start, end),
      fetchDbBusy(
        input.customerId,
        Math.round(end.diff(start, "minutes").minutes),
        start.minus({ minutes: 1 }),
        end.plus({ minutes: 1 })
      ),
    ]);
    if (overlapsBusy(start, end, [...googleBusy, ...dbBusy])) {
      return {
        success: false,
        calendarEventId: null,
        scheduledAt: input.slot.start,
        error: "That time is no longer available",
      };
    }

    // 2. Create the Google Calendar event.
    const calendar = getCalendarClient();
    const descriptionLines = [
      input.issueSummary ? `Issue: ${input.issueSummary}` : null,
      input.serviceAddress ? `Address: ${input.serviceAddress}` : null,
      input.callerPhone ? `Phone: ${input.callerPhone}` : null,
    ].filter(Boolean);

    const event = await calendar.events.insert(
      {
        calendarId: input.calendarId,
        sendUpdates: "none",
        requestBody: {
          summary: `Plumbing job — ${input.callerName ?? "Customer"}`,
          description: descriptionLines.join("\n"),
          start: { dateTime: input.slot.start.toISOString() },
          end: { dateTime: input.slot.end.toISOString() },
        },
      },
      { timeout: GOOGLE_TIMEOUT_MS }
    );
    const calendarEventId = event.data.id ?? null;

    // 3. Persist the booking, idempotent on call_id.
    const notes = [
      input.callerName ? `Caller: ${input.callerName}` : null,
      input.issueSummary,
      input.serviceAddress ? `Address: ${input.serviceAddress}` : null,
    ]
      .filter(Boolean)
      .join(" — ");

    await db
      .insert(bookings)
      .values({
        callId: input.callId,
        customerId: input.customerId,
        scheduledAt: input.slot.start,
        calendarEventId,
        status: "confirmed",
        notes: notes || null,
      })
      .onConflictDoNothing({ target: bookings.callId });

    return { success: true, calendarEventId, scheduledAt: input.slot.start };
  } catch (err) {
    console.error("[calendar-availability] bookSlot failed", err);
    return {
      success: false,
      calendarEventId: null,
      scheduledAt: input.slot.start,
      error: "Calendar unavailable",
    };
  }
}
