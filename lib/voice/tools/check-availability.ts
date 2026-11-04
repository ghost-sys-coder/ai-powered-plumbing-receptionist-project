import { getAgentBookingContext } from "@/lib/services/vapi-agents";
import { getAvailableSlots, parsePreferredDate } from "@/lib/services/calendar-availability";
import type { ToolHandler } from "./types";

// Offers open appointment slots near the caller's preferred day and time.
export const checkAvailabilityTool: ToolHandler = {
  name: "check_availability",
  invalidRequestMessage: "Sorry, I couldn't read that request.",

  async run({ agentId, args }) {
    const t0 = Date.now();
    console.log(`[tool] check_availability received (assistant=${agentId ?? "?"})`);

    if (!agentId) return "I couldn't access the schedule right now.";

    const ctx = await getAgentBookingContext(agentId);
    if (!ctx || ctx.calendarType !== "google_calendar" || !ctx.calendarId) {
      console.log(
        `[tool] check_availability -> manual/no-calendar (ctx=${!!ctx} type=${ctx?.calendarType} calId=${!!ctx?.calendarId})`
      );
      return "Booking is handled manually. I'll take your details and have someone call you back to confirm a time.";
    }

    const fromDate = parsePreferredDate(args.preferred_date, ctx.timezone);
    // Providers may send the flag as a boolean or the string "true".
    const urgent = String(args.urgent).toLowerCase() === "true";

    const slots = await getAvailableSlots({
      calendarId: ctx.calendarId,
      durationMinutes: ctx.appointmentDurationMinutes,
      bufferMinutes: ctx.appointmentBufferMinutes,
      customerId: ctx.customerId,
      timezone: ctx.timezone,
      businessHours: ctx.businessHours,
      fromDate,
      preferredTime: args.preferred_time ?? null,
      minLeadMinutes: urgent ? ctx.emergencyLeadMinutes : ctx.minLeadMinutes,
    });

    console.log(
      `[tool] check_availability -> ${slots.length} slots in ${Date.now() - t0}ms (date="${args.preferred_date ?? ""}" time="${args.preferred_time ?? ""}" urgent=${urgent})`
    );

    if (slots.length === 0) {
      return "I don't see any openings in that window. Could you try another day, or I can take your details for a callback?";
    }

    const options = slots
      .slice(0, 3)
      .map((s, i) => `(${i + 1}) ${s.label} [${s.startIso}]`)
      .join("; ");

    // These are a sample, not the full schedule — say so explicitly, or the model
    // tells callers nothing else is open and refuses times it never checked.
    return `Some open times: ${options}. These are a sample, not every opening. If the caller wants a different time or day, call check_availability again with that preferred_time and preferred_date — never tell them other times are unavailable without checking. When you book, use the exact bracketed time as slot_start.`;
  },
};
