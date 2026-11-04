import { getAgentBookingContext } from "@/lib/services/vapi-agents";
import {
  bookSlot,
  getAvailableSlots,
  formatSlotLabel,
} from "@/lib/services/calendar-availability";
import { resolveOrCreateCallId } from "@/lib/services/calls";
import { createPendingBooking } from "@/lib/services/bookings";
import type { ToolHandler } from "./types";

// Books the slot the caller agreed to on the business's calendar.
export const bookAppointmentTool: ToolHandler = {
  name: "book_appointment",
  invalidRequestMessage: "Sorry, I couldn't read that request.",

  async run({ agentId, providerCallId, callerNumber, args }) {
    console.log(`[tool] book_appointment received (assistant=${agentId ?? "?"})`);

    if (!agentId || !providerCallId) {
      return "I couldn't complete the booking just now, but I've noted your request and someone will call to confirm.";
    }

    const ctx = await getAgentBookingContext(agentId);
    if (!ctx || ctx.calendarType !== "google_calendar" || !ctx.calendarId) {
      return "I've noted your details and someone will call you back to confirm a time.";
    }

    const start = new Date(String(args.slot_start));
    if (Number.isNaN(start.getTime())) {
      return "I didn't catch a valid time. Could you pick one of the times I offered?";
    }
    const end = new Date(start.getTime() + ctx.appointmentDurationMinutes * 60_000);

    // Resolve the internal calls.id (create on demand) — bookings.call_id is NOT NULL.
    const callId = await resolveOrCreateCallId(providerCallId, {
      vapiCallId: providerCallId,
      customerId: ctx.customerId,
      vapiAgentId: ctx.vapiAgentId,
      callerPhone: args.caller_phone ?? callerNumber ?? null,
      startedAt: new Date(),
    });

    const result = await bookSlot({
      calendarId: ctx.calendarId,
      customerId: ctx.customerId,
      vapiAgentId: ctx.vapiAgentId,
      callId,
      slot: { start, end },
      callerName: args.caller_name ?? null,
      callerPhone: args.caller_phone ?? null,
      issueSummary: args.issue_summary ?? null,
      serviceAddress: args.service_address ?? null,
      // The slot may have been offered under the (shorter) emergency lead time.
      minLeadMinutes: Math.min(ctx.minLeadMinutes, ctx.emergencyLeadMinutes),
      timezone: ctx.timezone,
    });

    if (result.success) {
      const label = formatSlotLabel(result.scheduledAt, ctx.timezone);
      console.log(`[tool] book_appointment -> booked ${result.scheduledAt.toISOString()}`);
      return `You're booked for ${label}. You'll receive a confirmation shortly. Is there anything else I can help you with?`;
    }

    // Collision — offer fresh options in the same response.
    if (result.error === "That time is no longer available") {
      const slots = await getAvailableSlots({
        calendarId: ctx.calendarId,
        durationMinutes: ctx.appointmentDurationMinutes,
        bufferMinutes: ctx.appointmentBufferMinutes,
        customerId: ctx.customerId,
        timezone: ctx.timezone,
        businessHours: ctx.businessHours,
        fromDate: start,
        minLeadMinutes: ctx.minLeadMinutes,
      });
      if (slots.length > 0) {
        const options = slots
          .slice(0, 3)
          .map((s, i) => `(${i + 1}) ${s.label} [${s.startIso}]`)
          .join("; ");
        return `That time is no longer available. Some open times: ${options}. These are a sample, not every opening — if none suit the caller, call check_availability with their preferred time. Use the exact bracketed time as slot_start.`;
      }
    }

    // Calendar error (or no alternatives) — record a pending booking so it's not lost.
    await createPendingBooking({
      callId,
      customerId: ctx.customerId,
      scheduledAt: start,
      notes: [
        args.caller_name ? `Caller: ${args.caller_name}` : null,
        args.issue_summary ?? null,
        args.service_address ? `Address: ${args.service_address}` : null,
        "(direct booking failed — confirm manually)",
      ]
        .filter(Boolean)
        .join(" — "),
    });

    return "I wasn't able to book that directly, but I've noted your preferred time and someone will confirm with you shortly.";
  },
};
