import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calls } from "@/db/schema";
import { getAgentAlertContext } from "@/lib/services/vapi-agents";
import { resolveOrCreateCallId } from "@/lib/services/calls";
import { sendSms } from "@/lib/twilio/send-sms";
import type { ToolHandler } from "./types";

// What the model tells the caller when the text can't be sent. Deliberately
// promises nothing we can't back up.
const FALLBACK =
  "The alert could not be sent automatically. Tell the caller the team will call them back as soon as possible.";

// Texts the business owner the moment the AI flags an emergency, mid-call, so
// "someone will call you back right away" is actually true. One text per call.
export const notifyOwnerTool: ToolHandler = {
  name: "notify_owner_emergency",
  invalidRequestMessage: FALLBACK,

  async run({ agentId, providerCallId, callerNumber, args }) {
    if (!agentId || !providerCallId) return FALLBACK;

    const ctx = await getAgentAlertContext(agentId);
    if (!ctx?.alertPhone) {
      console.warn(`[tool] notify_owner: no alert phone set for assistant ${agentId}`);
      return FALLBACK;
    }
    if (ctx.alertPhone === process.env.TWILIO_FROM_NUMBER) {
      console.error(`[tool] notify_owner: alert phone is the Twilio sender itself (assistant ${agentId})`);
      return FALLBACK;
    }

    const callback = args.callback_number || callerNumber;

    const callId = await resolveOrCreateCallId(providerCallId, {
      vapiCallId: providerCallId,
      customerId: ctx.customerId,
      vapiAgentId: ctx.vapiAgentId,
      callerPhone: callerNumber,
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
      return "The owner has already been alerted about this call. Don't call this tool again.";
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
      console.error(`[tool] notify_owner: SMS failed for call ${providerCallId}: ${sent.error}`);
      // Release the claim so a retry in this call can still alert the owner.
      await db.update(calls).set({ ownerAlertedAt: null }).where(eq(calls.id, callId));
      return FALLBACK;
    }

    console.log(`[tool] notify_owner: alerted owner for call ${providerCallId} (sms ${sent.sid})`);
    return "The owner has been alerted by text with the caller's details and will call them back as soon as possible. Let the caller know.";
  },
};
