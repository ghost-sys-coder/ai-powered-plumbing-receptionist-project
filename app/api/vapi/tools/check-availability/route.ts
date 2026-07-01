import { checkVapiSignature } from "@/lib/vapi/verify-signature";
import { vapiToolResult, parseToolArgs } from "@/lib/vapi/tool-response";
import { getAgentBookingContext } from "@/lib/services/vapi-agents";
import { getAvailableSlots, parsePreferredDate } from "@/lib/services/calendar-availability";

type VapiToolPayload = {
  message?: {
    toolCallList?: Array<{ id?: string; function?: { arguments?: unknown } }>;
    call?: { id?: string; assistantId?: string };
  };
};

export async function POST(request: Request): Promise<Response> {
  const t0 = Date.now();
  const rawBody = await request.text();
  const unauthorized = checkVapiSignature(request, rawBody);
  if (unauthorized) return unauthorized;
  console.log("[tool] check_availability received");

  let payload: VapiToolPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return vapiToolResult("", "Sorry, I couldn't read that request.");
  }

  const toolCall = payload.message?.toolCallList?.[0];
  const toolCallId = toolCall?.id ?? "";
  const assistantId = payload.message?.call?.assistantId;

  if (!assistantId) {
    return vapiToolResult(toolCallId, "I couldn't access the schedule right now.");
  }

  const ctx = await getAgentBookingContext(assistantId);
  if (!ctx || ctx.calendarType !== "google_calendar" || !ctx.calendarId) {
    return vapiToolResult(
      toolCallId,
      "Booking is handled manually. I'll take your details and have someone call you back to confirm a time."
    );
  }

  const args = parseToolArgs(toolCall?.function?.arguments);
  const fromDate = parsePreferredDate(args.preferred_date, ctx.timezone);

  const slots = await getAvailableSlots({
    calendarId: ctx.calendarId,
    durationMinutes: ctx.appointmentDurationMinutes,
    bufferMinutes: ctx.appointmentBufferMinutes,
    customerId: ctx.customerId,
    timezone: ctx.timezone,
    businessHours: ctx.businessHours,
    fromDate,
  });

  if (slots.length === 0) {
    return vapiToolResult(
      toolCallId,
      "I don't see any openings in that window. Could you try another day, or I can take your details for a callback?"
    );
  }

  const options = slots
    .slice(0, 3)
    .map((s, i) => `(${i + 1}) ${s.label} [${s.startIso}]`)
    .join("; ");

  console.log(`[tool] check_availability -> ${slots.length} slots in ${Date.now() - t0}ms`);
  return vapiToolResult(
    toolCallId,
    `I have these times available: ${options}. Which works best for you? When you book, use the exact bracketed time as slot_start.`
  );
}
