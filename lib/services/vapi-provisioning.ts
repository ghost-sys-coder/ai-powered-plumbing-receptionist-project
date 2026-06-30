import { VapiClient } from "@vapi-ai/server-sdk";
import { buildAgentPrompt } from "@/lib/templates/agent-prompt";
import { CALL_DATA_KEY } from "@/lib/services/calls";

function getVapi() {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY is not set");
  return new VapiClient({ token: key });
}

export interface ProvisioningConfig {
  businessName: string;
  ownerName: string;
  serviceArea: string;
  servicesOffered: Array<{ name: string; price?: string }>;
  pricing: {
    serviceCallFee?: string;
    hourlyRate?: string;
    afterHoursSurcharge?: string;
    freeEstimates?: boolean;
  };
  emergencyDefinition: string;
  businessHours: Record<string, { open?: string; close?: string; closed?: boolean }>;
}

// Tells Vapi to extract structured data from every call. The property keys here
// MUST match the keys read in lib/services/calls.ts (StructuredCallData) and the
// enum values must match db/schema/enums.ts (callOutcomeEnum / urgencyLevelEnum).
//
// Vapi deprecated the single-schema `structuredDataPlan` (→ analysis.structuredData)
// in favour of the catalog-based `structuredDataMultiPlan` (→ analysis.structuredDataMulti).
// We register under CALL_DATA_KEY and disable the legacy plan to clear the
// deprecation warning. The webhook reads the result via extractStructuredData().
const CALL_DATA_SCHEMA = {
  type: "object",
  properties: {
    caller_name: {
      type: "string",
      description:
        "The caller's full name as given on the call. Empty string if never provided.",
    },
    issue_summary: {
      type: "string",
      description:
        "One or two sentences describing the plumbing problem or reason for the call.",
    },
    urgency_level: {
      type: "string",
      enum: ["emergency", "urgent", "routine", "unknown"],
      description:
        "How urgent the job is. 'emergency' = active flooding/no water/gas/sewage now; 'urgent' = needs attention within ~24h; 'routine' = can be scheduled normally; 'unknown' if unclear.",
    },
    service_address: {
      type: "string",
      description:
        "The full service address (where the work is needed). Empty string if not provided.",
    },
    callback_number: {
      type: "string",
      description:
        "The callback phone number the caller provided, digits only (e.g. '5805551234'). Empty string if not provided.",
    },
    outcome: {
      type: "string",
      enum: ["booked", "message_taken", "transferred", "dropped", "abandoned"],
      description:
        "How the call concluded. 'booked' = appointment scheduled; 'message_taken' = message left for the shop; 'transferred' = handed to a human; 'dropped' = caller hung up before resolution; 'abandoned' = no meaningful interaction.",
    },
    booking_time: {
      type: "string",
      description:
        "If an appointment was booked, the agreed date/time as an ISO 8601 timestamp. Empty string if no booking was made.",
    },
  },
  required: ["issue_summary", "urgency_level", "outcome"],
} as const;

const CALL_ANALYSIS_PLAN = {
  // Disable the deprecated single-schema plan.
  structuredDataPlan: { enabled: false },
  // Catalog-based plan (the non-deprecated path).
  structuredDataMultiPlan: [
    {
      key: CALL_DATA_KEY,
      plan: {
        enabled: true,
        schema: CALL_DATA_SCHEMA,
      },
    },
  ],
} as const;

function extractVapiError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    // @vapi-ai/server-sdk wraps API errors with body/statusCode
    if (e.body && typeof e.body === "object") {
      const body = e.body as Record<string, unknown>;
      const msg = body.message ?? body.error ?? body.detail;
      if (msg) return `Vapi: ${msg} (status ${e.statusCode ?? "?"})`;
    }
    if (typeof e.message === "string") return e.message;
  }
  return String(err);
}

export async function createVapiAssistant(
  config: ProvisioningConfig
): Promise<{ vapiAssistantId: string }> {
  const systemPrompt = buildAgentPrompt(config);
  const vapi = getVapi();

  try {
    const assistant = await vapi.assistants.create({
      name: `${config.businessName} AI Receptionist`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
      } as any,
      voice: { provider: "11labs", voiceId: "paula" } as any,
      firstMessage: `Thank you for calling ${config.businessName}, how can I help you today?`,
      analysisPlan: CALL_ANALYSIS_PLAN as any,
    });
    return { vapiAssistantId: assistant.id };
  } catch (err) {
    throw new Error(`Failed to create Vapi assistant — ${extractVapiError(err)}`);
  }
}

export function extractAreaCode(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 3) return digits;                              // bare area code e.g. "580"
  if (digits.length === 11 && digits[0] === "1") return digits.slice(1, 4); // +1XXXXXXXXXX
  if (digits.length === 10) return digits.slice(0, 3);                // XXXXXXXXXX
  return null;
}

export async function provisionVapiPhoneNumber(areaCode?: string | null): Promise<{
  vapiPhoneNumberId: string;
  phoneNumber: string;
}> {
  const vapi = getVapi();

  const payload: Record<string, unknown> = { provider: "vapi" };
  if (areaCode) payload.numberDesiredAreaCode = areaCode;

  try {
    const number = await vapi.phoneNumbers.create(payload as any);
    return {
      vapiPhoneNumberId: (number as any).id,
      phoneNumber: (number as any).number ?? "",
    };
  } catch (err) {
    const areaInfo = areaCode ? ` (area code ${areaCode})` : "";
    throw new Error(`Failed to provision phone number${areaInfo} — ${extractVapiError(err)}`);
  }
}

export async function updateVapiAssistant(
  assistantId: string,
  config: ProvisioningConfig
): Promise<void> {
  const systemPrompt = buildAgentPrompt(config);
  const vapi = getVapi();

  await vapi.assistants.update({
    id: assistantId,
    name: `${config.businessName} AI Receptionist`,
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
    } as any,
    firstMessage: `Thank you for calling ${config.businessName}, how can I help you today?`,
    analysisPlan: CALL_ANALYSIS_PLAN as any,
  } as any);
}

export async function linkPhoneNumberToAssistant(
  vapiPhoneNumberId: string,
  vapiAssistantId: string
): Promise<void> {
  const vapi = getVapi();
  try {
    await vapi.phoneNumbers.update({
      id: vapiPhoneNumberId,
      body: { assistantId: vapiAssistantId } as any,
    });
  } catch (err) {
    throw new Error(`Failed to link phone number to assistant — ${extractVapiError(err)}`);
  }
}
