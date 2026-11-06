import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calls, customers, vapiAgents } from "@/db/schema";
import { appOrigin } from "@/lib/billing/stripe";
import { sendSms } from "@/lib/twilio/send-sms";

const OUTCOME_LABEL: Record<string, string> = {
  booked: "Booked",
  message_taken: "Message taken",
  transferred: "Transferred to you",
  dropped: "Caller hung up",
  abandoned: "Caller hung up",
};

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

// The text itself. Pure, for testing. Kept short: one SMS segment where
// possible, two at most.
export function callSummaryText(input: {
  businessName: string;
  outcome: string | null;
  callerName: string | null;
  callerPhone: string | null;
  issueSummary: string | null;
  link: string;
}): string {
  return [
    `${clip(input.businessName, 40)}: new call`,
    `${OUTCOME_LABEL[input.outcome ?? ""] ?? "Call ended"}`,
    `From: ${input.callerName ? clip(input.callerName, 40) : "unknown"}${input.callerPhone ? ` ${input.callerPhone}` : ""}`,
    input.issueSummary ? `About: ${clip(input.issueSummary, 160)}` : null,
    input.link,
  ]
    .filter(Boolean)
    .join("\n");
}

// Whether a finished call is worth a text: there must be something to act on.
export function shouldTextSummary(call: {
  outcome: string | null;
  callerPhone: string | null;
  issueSummary: string | null;
  ownerAlertedAt: Date | null;
}): boolean {
  if (call.ownerAlertedAt) return false; // the emergency text already covered it
  if (!call.callerPhone && !call.issueSummary) return false; // nothing to call back on
  return true;
}

// Texts the business owner a summary of a finished call, when they've opted
// in. Never throws: a failed text must not break the end-of-call webhook.
export async function textCallSummary(callId: string): Promise<void> {
  try {
    const [row] = await db
      .select({
        outcome: calls.outcome,
        callerName: calls.callerName,
        callerPhone: calls.callerPhone,
        issueSummary: calls.issueSummary,
        ownerAlertedAt: calls.ownerAlertedAt,
        summaryTextedAt: calls.summaryTextedAt,
        businessName: customers.businessName,
        alertPhone: vapiAgents.alertPhone,
        enabled: vapiAgents.callSummaryTexts,
      })
      .from(calls)
      .innerJoin(customers, eq(calls.customerId, customers.id))
      .innerJoin(vapiAgents, eq(vapiAgents.customerId, calls.customerId))
      .where(eq(calls.id, callId))
      .limit(1);
    if (!row || !row.enabled || !row.alertPhone || row.summaryTextedAt) return;
    if (!shouldTextSummary(row)) return;

    const claimed = await db
      .update(calls)
      .set({ summaryTextedAt: new Date() })
      .where(and(eq(calls.id, callId), isNull(calls.summaryTextedAt)))
      .returning({ id: calls.id });
    if (claimed.length === 0) return;

    const text = callSummaryText({ ...row, link: `${appOrigin()}/dashboard/calls/${callId}` });
    const sent = await sendSms(row.alertPhone, text);
    if (!sent.ok) {
      console.error(`[summary-text] call ${callId}: ${sent.error}`);
      await db.update(calls).set({ summaryTextedAt: null }).where(eq(calls.id, callId));
    }
  } catch (err) {
    console.error(`[summary-text] call ${callId} failed:`, err);
  }
}
