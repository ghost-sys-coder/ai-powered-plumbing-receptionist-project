import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calls } from "@/db/schema";
import { checkVapiSignature } from "@/lib/vapi/verify-signature";
import { vapiToolResult, parseToolArgs } from "@/lib/vapi/tool-response";
import { getAgentAlertContext } from "@/lib/services/vapi-agents";
import { resolveOrCreateCallId } from "@/lib/services/calls";
import { sendSms } from "@/lib/twilio/send-sms";

const FN = "notify_owner_emergency";

// What the model tells the caller when the text can't be sent. Deliberately
// promises nothing we can't back up.
const FALLBACK =
  "The alert could not be sent automatically. Tell the caller the team will call them back as soon as possible.";

type VapiToolPayload = {
  message?: {
    toolCallList?: Array<{ id?: string; function?: { name?: string; arguments?: unknown } }>;
    call?: { id?: string; assistantId?: string; customer?: { number?: string | null } };
  };
};

// Texts the business owner the moment the AI flags an emergency, mid-call, so
// "someone will call you back right away" is actually true. One text per call.
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const unauthorized = checkVapiSignature(request, rawBody);
  if (unauthorized) return unauthorized;

  let payload: VapiToolPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return vapiToolResult("", FN, FALLBACK);
  }

  const toolCall = payload.message?.toolCallList?.[0];
  const toolCallId = toolCall?.id ?? "";
  const name = toolCall?.function?.name ?? FN;
  const assistantId = payload.message?.call?.assistantId;
  const vapiCallId = payload.message?.call?.id;
  if (!assistantId || !vapiCallId) return vapiToolResult(toolCallId, name, FALLBACK);

  const ctx = await getAgentAlertContext(assistantId);
  if (!ctx?.alertPhone) {
    console.warn(`[tool] notify_owner: no alert phone set for assistant ${assistantId}`);
    return vapiToolResult(toolCallId, name, FALLBACK);
  }
  if (ctx.alertPhone === process.env.TWILIO_FROM_NUMBER) {
    console.error(`[tool] notify_owner: alert phone is the Twilio sender itself (assistant ${assistantId})`);
    return vapiToolResult(toolCallId, name, FALLBACK);
  }

  const args = parseToolArgs(toolCall?.function?.arguments);
  const callerIdNumber = payload.message?.call?.customer?.number ?? null;
  const callback = args.callback_number || callerIdNumber;

  const callId = await resolveOrCreateCallId(vapiCallId, {
    vapiCallId,
    customerId: ctx.customerId,
    vapiAgentId: ctx.vapiAgentId,
    callerPhone: callerIdNumber,
    startedAt: new Date(),
  });

  // Claim the alert atomically — a second invocation in the same call finds it
  // already set and doesn't text again.
  const claimed = await db
    .update(calls)
    .set({ ownerAlertedAt: new Date() })
    .where(and(eq(calls.id, callId), isNull(calls.ownerAlertedAt)))
    .returning({ id: calls.id });
  if (claimed.length === 0) {
    return vapiToolResult(
      toolCallId,
      name,
      "The owner has already been alerted about this call. Don't call this tool again."
    );
  }

  const text = [
    `EMERGENCY call - ${ctx.businessName}`,
    `Caller: ${args.caller_name || "not given"}`,
    `Call back: ${callback || "not given"}`,
    `Address: ${args.service_address || "not given yet"}`,
    `Issue: ${args.issue_summary || "not given"}`,
  ].join("\n");

  const sent = await sendSms(ctx.alertPhone, text);
  if (!sent.ok) {
    console.error(`[tool] notify_owner: SMS failed for call ${vapiCallId}: ${sent.error}`);
    // Release the claim so a retry in this call can still alert the owner.
    await db.update(calls).set({ ownerAlertedAt: null }).where(eq(calls.id, callId));
    return vapiToolResult(toolCallId, name, FALLBACK);
  }

  console.log(`[tool] notify_owner: alerted owner for call ${vapiCallId} (sms ${sent.sid})`);
  return vapiToolResult(
    toolCallId,
    name,
    "The owner has been alerted by text with the caller's details and will call them back as soon as possible. Let the caller know."
  );
}
