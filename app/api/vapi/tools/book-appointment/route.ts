import { checkVapiSignature } from "@/lib/vapi/verify-signature";
import { vapiToolResult, parseToolArgs } from "@/lib/vapi/tool-response";
import { getAgentBookingContext } from "@/lib/services/vapi-agents";
import {
  bookSlot,
  getAvailableSlots,
  formatSlotLabel,
} from "@/lib/services/calendar-availability";
import { resolveOrCreateCallId } from "@/lib/services/calls";
import { createPendingBooking } from "@/lib/services/bookings";

type VapiToolPayload = {
  message?: {
    toolCallList?: Array<{ id?: string; function?: { arguments?: unknown } }>;
    call?: { id?: string; assistantId?: string; customer?: { number?: string | null } };
  };
};

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const unauthorized = checkVapiSignature(request, rawBody);
  if (unauthorized) return unauthorized;
  console.log("[tool] book_appointment received");

  let payload: VapiToolPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return vapiToolResult("", "Sorry, I couldn't read that request.");
  }

  const toolCall = payload.message?.toolCallList?.[0];
  const toolCallId = toolCall?.id ?? "";
  const assistantId = payload.message?.call?.assistantId;
  const vapiCallId = payload.message?.call?.id;

  if (!assistantId || !vapiCallId) {
    return vapiToolResult(
      toolCallId,
      "I couldn't complete the booking just now, but I've noted your request and someone will call to confirm."
    );
  }

  const ctx = await getAgentBookingContext(assistantId);
  if (!ctx || ctx.calendarType !== "google_calendar" || !ctx.calendarId) {
    return vapiToolResult(
      toolCallId,
      "I've noted your details and someone will call you back to confirm a time."
    );
  }

  const args = parseToolArgs(toolCall?.function?.arguments);
  const start = new Date(String(args.slot_start));
  if (Number.isNaN(start.getTime())) {
    return vapiToolResult(
      toolCallId,
      "I didn't catch a valid time. Could you pick one of the times I offered?"
    );
  }
  const end = new Date(start.getTime() + ctx.appointmentDurationMinutes * 60_000);

  // Resolve the internal calls.id (create on demand) — bookings.call_id is NOT NULL.
  const callId = await resolveOrCreateCallId(vapiCallId, {
    vapiCallId,
    customerId: ctx.customerId,
    vapiAgentId: ctx.vapiAgentId,
    callerPhone: args.caller_phone ?? payload.message?.call?.customer?.number ?? null,
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
  });

  if (result.success) {
    const label = formatSlotLabel(result.scheduledAt, ctx.timezone);
    return vapiToolResult(
      toolCallId,
      `You're booked for ${label}. You'll receive a confirmation shortly. Is there anything else I can help you with?`
    );
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
    });
    if (slots.length > 0) {
      const options = slots
        .slice(0, 3)
        .map((s, i) => `(${i + 1}) ${s.label} [${s.startIso}]`)
        .join("; ");
      return vapiToolResult(
        toolCallId,
        `That time was just taken. I now have: ${options}. Which works? Use the exact bracketed time as slot_start.`
      );
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

  return vapiToolResult(
    toolCallId,
    "I wasn't able to book that directly, but I've noted your preferred time and someone will confirm with you shortly."
  );
}
