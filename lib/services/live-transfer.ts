import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import { isWithinBusinessHours } from "@/lib/services/calendar-availability";

// Reply to Vapi's "transfer-destination-request": the shared transferCall tool
// has no fixed destination, so Vapi asks us — per call — where to send it.
// `error` refuses the transfer; the model is told and carries on.
export type TransferDestinationResponse =
  | {
      destination: {
        type: "number";
        number: string;
        message: string;
        transferPlan: {
          mode: "warm-transfer-experimental";
          summaryPlan: { enabled: true };
          fallbackPlan: { message: string; endCallEnabled: false };
        };
      };
    }
  | { error: string };

export type TransferSettings = {
  transferEnabled: boolean;
  transferPhone: string | null;
  alertPhone: string | null;
  transferAfterHours: boolean;
  businessHours: unknown;
  ownerName: string;
  timezone: string;
};

// Pure decision: whether to transfer and where, given a business's settings.
export function buildTransferResponse(
  s: TransferSettings | null,
  now: Date = new Date()
): TransferDestinationResponse {
  const number = s?.transferPhone || s?.alertPhone;
  if (!s?.transferEnabled || !number) {
    return { error: "Live transfer isn't available for this business. Continue helping the caller and offer to book the soonest visit." };
  }
  if (!s.transferAfterHours && !isWithinBusinessHours(s.businessHours, s.timezone, now)) {
    return { error: "The owner isn't taking live transfers outside business hours. They've been alerted by text — continue and offer to book the soonest visit." };
  }

  const owner = s.ownerName;
  return {
    destination: {
      type: "number",
      number,
      message: `Please hold while I connect you to ${owner}.`,
      transferPlan: {
        // Owner is rung while the caller holds and gets an AI summary before
        // being connected. If they don't pick up (or voicemail answers), the
        // caller hears the fallback and the assistant stays on the call.
        mode: "warm-transfer-experimental",
        summaryPlan: { enabled: true },
        fallbackPlan: {
          message: `I wasn't able to reach ${owner} just now, but ${owner} has your details and will call you back as soon as possible. In the meantime, let's get the soonest visit booked for you.`,
          endCallEnabled: false,
        },
      },
    },
  };
}

export async function resolveTransferDestination(
  vapiAssistantId: string
): Promise<TransferDestinationResponse> {
  const [row] = await db
    .select({
      transferEnabled: vapiAgents.transferEnabled,
      transferPhone: vapiAgents.transferPhone,
      alertPhone: vapiAgents.alertPhone,
      transferAfterHours: vapiAgents.transferAfterHours,
      businessHours: vapiAgents.businessHours,
      agentOwnerName: vapiAgents.ownerName,
      customerOwnerName: customers.ownerName,
      timezone: customers.timezone,
    })
    .from(vapiAgents)
    .innerJoin(customers, eq(vapiAgents.customerId, customers.id))
    .where(eq(vapiAgents.vapiAssistantId, vapiAssistantId))
    .limit(1);

  return buildTransferResponse(
    row
      ? {
          transferEnabled: row.transferEnabled,
          transferPhone: row.transferPhone,
          alertPhone: row.alertPhone,
          transferAfterHours: row.transferAfterHours,
          businessHours: row.businessHours,
          ownerName: row.agentOwnerName || row.customerOwnerName,
          timezone: row.timezone,
        }
      : null
  );
}
