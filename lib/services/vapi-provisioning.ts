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
  timezone: string;
  calendarType: "google_calendar" | "manual";
  appointmentDurationMinutes: number;
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

// The check_availability / book_appointment function tools, attached only when
// the customer books via Google Calendar. Vapi POSTs tool calls to these URLs
// mid-conversation and feeds the result back to the model.
function buildCalendarTools(config: ProvisioningConfig): unknown[] {
  if (config.calendarType !== "google_calendar") return [];
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  return [
    {
      type: "function",
      function: {
        name: "check_availability",
        description:
          "Check available appointment slots for the plumbing business. Use when a caller wants to book an appointment.",
        parameters: {
          type: "object",
          properties: {
            preferred_date: {
              type: "string",
              description:
                "The caller's preferred date or period, e.g. 'Thursday', 'tomorrow', 'next week', 'morning'.",
            },
          },
          required: [],
        },
      },
      server: { url: `${appUrl}/api/vapi/tools/check-availability` },
    },
    {
      type: "function",
      function: {
        name: "book_appointment",
        description:
          "Book a confirmed appointment slot. Only call after the caller has explicitly agreed to a specific time.",
        parameters: {
          type: "object",
          properties: {
            slot_start: {
              type: "string",
              description:
                "The chosen slot start — the exact ISO 8601 value returned by check_availability. Do not reformat it.",
            },
            caller_name: { type: "string", description: "The caller's full name" },
            caller_phone: { type: "string", description: "The caller's phone number" },
            issue_summary: { type: "string", description: "Brief description of the issue" },
            service_address: { type: "string", description: "Address where the work is needed" },
          },
          required: ["slot_start"],
        },
      },
      server: { url: `${appUrl}/api/vapi/tools/book-appointment` },
    },
  ];
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
        "If an appointment was booked, the agreed date and time as a full ISO 8601 timestamp WITH the timezone offset (e.g. '2026-07-03T14:00:00-05:00'). Use the absolute date that was confirmed on the call — it must be in the future, never a past year. Empty string if no booking was made.",
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

// Reads the assistant back and confirms our structured-data plan survived the
// write. Vapi can silently drop `structuredDataMultiPlan` (e.g. a later save in
// the dashboard strips it), which leaves calls with no structured data and is
// otherwise invisible until someone inspects a call. Surface it loudly instead.
async function verifyAnalysisPlan(
  vapi: VapiClient,
  assistantId: string
): Promise<void> {
  const back = await vapi.assistants.get({ id: assistantId });
  const multi = (back as { analysisPlan?: { structuredDataMultiPlan?: Array<{ key?: string }> } })
    .analysisPlan?.structuredDataMultiPlan;
  const present = Array.isArray(multi) && multi.some((p) => p?.key === CALL_DATA_KEY);
  if (!present) {
    throw new Error(
      `Structured-data plan (key "${CALL_DATA_KEY}") was not applied to assistant ${assistantId} — ` +
        `Vapi dropped structuredDataMultiPlan. Calls would record no structured data. ` +
        `Re-run scripts/sync-vapi-analysis.ts and avoid editing analysis settings in the Vapi dashboard.`
    );
  }
}

export async function createVapiAssistant(
  config: ProvisioningConfig
): Promise<{ vapiAssistantId: string }> {
  const systemPrompt = buildAgentPrompt(config);
  const vapi = getVapi();

  let assistantId: string;
  try {
    const assistant = await vapi.assistants.create({
      name: `${config.businessName} AI Receptionist`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
        tools: buildCalendarTools(config),
      } as any,
      voice: { provider: "11labs", voiceId: "paula" } as any,
      firstMessage: `Thank you for calling ${config.businessName}, how can I help you today?`,
      analysisPlan: CALL_ANALYSIS_PLAN as any,
    });
    assistantId = assistant.id;
  } catch (err) {
    throw new Error(`Failed to create Vapi assistant — ${extractVapiError(err)}`);
  }

  await verifyAnalysisPlan(vapi, assistantId);
  return { vapiAssistantId: assistantId };
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
      tools: buildCalendarTools(config),
    } as any,
    firstMessage: `Thank you for calling ${config.businessName}, how can I help you today?`,
    analysisPlan: CALL_ANALYSIS_PLAN as any,
  } as any);

  await verifyAnalysisPlan(vapi, assistantId);
}

// Fetches the phone number currently attached to the assistant straight from
// Vapi (the source of truth), rather than the copy stored in our DB. Looks up by
// phone-number id first, then falls back to scanning the account's numbers for
// one linked to this assistant. Never throws — returns null on any failure so a
// page render can gracefully fall back to the stored value.
export async function getLiveAssistantPhoneNumber(opts: {
  phoneNumberId?: string | null;
  assistantId?: string | null;
}): Promise<{ number: string; status?: string } | null> {
  try {
    const vapi = getVapi();

    if (opts.phoneNumberId) {
      const pn = (await vapi.phoneNumbers.get({ id: opts.phoneNumberId })) as {
        number?: string;
        status?: string;
      };
      if (pn?.number) return { number: pn.number, status: pn.status };
    }

    if (opts.assistantId) {
      const resp = await vapi.phoneNumbers.list();
      const all = (Array.isArray(resp) ? resp : (resp as { data?: unknown[] })?.data ?? []) as Array<{
        number?: string;
        status?: string;
        assistantId?: string;
      }>;
      const match = all.find((p) => p?.assistantId === opts.assistantId && p?.number);
      if (match?.number) return { number: match.number, status: match.status };
    }

    return null;
  } catch (err) {
    console.error("[getLiveAssistantPhoneNumber] failed", err);
    return null;
  }
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
