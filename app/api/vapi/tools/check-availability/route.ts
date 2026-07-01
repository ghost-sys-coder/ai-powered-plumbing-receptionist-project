import { checkVapiSignature } from "@/lib/vapi/verify-signature";
import { vapiToolResult, parseToolArgs } from "@/lib/vapi/tool-response";
import { getAgentBookingContext } from "@/lib/services/vapi-agents";
import { getAvailableSlots, parsePreferredDate } from "@/lib/services/calendar-availability";

const FN = "check_availability";

type VapiToolPayload = {
  message?: {
    toolCallList?: Array<{ id?: string; function?: { name?: string; arguments?: unknown } }>;
    call?: { id?: string; assistantId?: string };
  };
};

export async function POST(request: Request): Promise<Response> {
  const t0 = Date.now();
  const rawBody = await request.text();
  const unauthorized = checkVapiSignature(request, rawBody);
  if (unauthorized) return unauthorized;

  let payload: VapiToolPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return vapiToolResult("", FN, "Sorry, I couldn't read that request.");
  }

  const toolCall = payload.message?.toolCallList?.[0];
  const toolCallId = toolCall?.id ?? "";
  const name = toolCall?.function?.name ?? FN;
  const assistantId = payload.message?.call?.assistantId;
  console.log(`[tool] check_availability received (assistant=${assistantId ?? "?"})`);

  if (!assistantId) {
    return vapiToolResult(toolCallId, name, "I couldn't access the schedule right now.");
  }

  const ctx = await getAgentBookingContext(assistantId);
  if (!ctx || ctx.calendarType !== "google_calendar" || !ctx.calendarId) {
    console.log(
      `[tool] check_availability -> manual/no-calendar (ctx=${!!ctx} type=${ctx?.calendarType} calId=${!!ctx?.calendarId})`
    );
    return vapiToolResult(
      toolCallId,
      name,
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
    preferredTime: args.preferred_time ?? null,
  });

  console.log(
    `[tool] check_availability -> ${slots.length} slots in ${Date.now() - t0}ms (date="${args.preferred_date ?? ""}" time="${args.preferred_time ?? ""}")`
  );

  if (slots.length === 0) {
    return vapiToolResult(
      toolCallId,
      name,
      "I don't see any openings in that window. Could you try another day, or I can take your details for a callback?"
    );
  }

  const options = slots
    .slice(0, 3)
    .map((s, i) => `(${i + 1}) ${s.label} [${s.startIso}]`)
    .join("; ");

  return vapiToolResult(
    toolCallId,
    name,
    `I have these times available: ${options}. Which works best for you? When you book, use the exact bracketed time as slot_start.`
  );
}
