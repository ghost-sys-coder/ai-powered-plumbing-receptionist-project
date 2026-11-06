import { VapiClient, type Vapi } from "@vapi-ai/server-sdk";
import {
  buildAgentPrompt,
  isLiveTransferActive,
  type PromptConfig,
} from "@/lib/templates/agent-prompt";
import { CALL_DATA_KEY } from "@/lib/services/calls";
import { getIndustry, type IndustryProfile } from "@/lib/verticals";

// A Vapi client for the given API key (from lib/voice/credentials), or the
// platform key when none is given (CLI scripts).
export function getVapi(apiKey?: string): VapiClient {
  const key = apiKey ?? process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY is not set");
  return new VapiClient({ token: key });
}

// Everything needed to build an assistant. `liveTransferEnabled` also attaches
// the shared live-transfer tool; `industry`/`country` pick the prompt profile.
export type ProvisioningConfig = PromptConfig;

// Definitions for the two calendar function tools. These are created as
// first-class Vapi Tool objects (not inline/transient on the assistant) so they
// show up in the dashboard, survive assistant edits, and are reliably passed to
// the model. Assistants reference them by id via `model.toolIds`.
export const CALENDAR_TOOL_DEFS = [
  {
    name: "check_availability",
    path: "/api/vapi/tools/check-availability",
    description:
      "Check available appointment slots for the business. Use when a caller wants to book an appointment.",
    parameters: {
      type: "object",
      properties: {
        preferred_date: {
          type: "string",
          description:
            "The caller's preferred day, e.g. 'Thursday', 'tomorrow', 'next week', 'Monday'.",
        },
        preferred_time: {
          type: "string",
          description:
            "The caller's preferred time of day if they mention one, e.g. '2 PM', 'morning', 'afternoon'. Omit if not stated.",
        },
        urgent: {
          type: "boolean",
          description:
            "true if the caller's issue is an emergency under the business's emergency definition. Offers the soonest visits with shorter notice. Omit or false otherwise.",
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "book_appointment",
    path: "/api/vapi/tools/book-appointment",
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
];

export type ToolDef = (typeof CALENDAR_TOOL_DEFS)[number] | typeof NOTIFY_OWNER_TOOL_DEF;

// Texts the business owner mid-call when the AI flags an emergency. Attached to
// every assistant, whatever its calendar type.
export const NOTIFY_OWNER_TOOL_DEF = {
  name: "notify_owner_emergency",
  path: "/api/vapi/tools/notify-owner",
  description:
    "Immediately text the business owner about an emergency call. Call exactly once per call, as soon as you have confirmed the issue is an emergency and have the caller's callback number.",
  parameters: {
    type: "object",
    properties: {
      caller_name: { type: "string", description: "The caller's name, if given" },
      callback_number: {
        type: "string",
        description: "The number to call the caller back on. Omit to use the number they are calling from.",
      },
      service_address: { type: "string", description: "Address where the work is needed, if given" },
      issue_summary: {
        type: "string",
        description: "One sentence on the emergency, e.g. 'Burst pipe under kitchen sink, water spreading'",
      },
    },
    required: ["issue_summary"] as string[],
  },
};

// Tools for an assistant: the owner alert always, plus the calendar tools when
// it books directly into Google Calendar.
export function toolDefsFor(calendarType: ProvisioningConfig["calendarType"]): ToolDef[] {
  return calendarType === "google_calendar"
    ? [...CALENDAR_TOOL_DEFS, NOTIFY_OWNER_TOOL_DEF]
    : [NOTIFY_OWNER_TOOL_DEF];
}

// The shared live-transfer tool: a transferCall tool with NO destinations, so
// on each use Vapi sends "transfer-destination-request" to the org webhook
// (authenticated by the org credential), which answers with that business's
// owner number — see lib/services/live-transfer.ts. Created once, reused.
async function ensureTransferToolId(vapi: VapiClient): Promise<string> {
  const listResp = await vapi.tools.list();
  const existing = (
    Array.isArray(listResp) ? listResp : ((listResp as { data?: unknown[] })?.data ?? [])
  ) as Array<{ id?: string; type?: string; destinations?: unknown[] }>;

  const found = existing.find(
    (t) => t.type === "transferCall" && (!t.destinations || t.destinations.length === 0)
  );
  if (found?.id) return found.id;

  const created = (await vapi.tools.create({
    type: "transferCall",
    destinations: [],
  } as never)) as { id: string };
  return created.id;
}

// Every tool id an assistant should reference.
async function toolIdsFor(vapi: VapiClient, config: ProvisioningConfig): Promise<string[]> {
  const ids = await ensureToolIds(vapi, toolDefsFor(config.calendarType));
  if (isLiveTransferActive(config)) ids.push(await ensureTransferToolId(vapi));
  return ids;
}

// Upserts the given tools in the Vapi account (create if missing, update the
// server URL + definition if present) and returns their ids. Idempotent, keyed
// by function name, so re-running it refreshes the tool server URLs without
// creating duplicates.
//
// The tools are shared by every assistant, so their URL must be the production
// app. VAPI_TOOLS_BASE_URL pins it independently of NEXT_PUBLIC_APP_URL: a local
// sync run with NEXT_PUBLIC_APP_URL set to a dev tunnel would otherwise repoint
// every customer's booking tools at that tunnel.
async function ensureToolIds(vapi: VapiClient, defs: ToolDef[]): Promise<string[]> {
  const appUrl = (
    process.env.VAPI_TOOLS_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    ""
  ).replace(/\/$/, "");
  if (!appUrl) {
    throw new Error("VAPI_TOOLS_BASE_URL (or NEXT_PUBLIC_APP_URL) must be set to register tools");
  }
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("[vapi-tools] VAPI_WEBHOOK_SECRET not set — tools registered without an auth header");
  }
  const listResp = await vapi.tools.list();
  const existing = (
    Array.isArray(listResp) ? listResp : ((listResp as { data?: unknown[] })?.data ?? [])
  ) as Array<{ id?: string; function?: { name?: string } }>;

  const ids: string[] = [];
  for (const def of defs) {
    // `type` is required on create but rejected on update — keep it out of the
    // shared body and add it only for the create call.
    const body = {
      async: false,
      function: {
        name: def.name,
        description: def.description,
        parameters: def.parameters,
      },
      // X-Vapi-Secret authenticates every tool call (see lib/vapi/verify-signature).
      // Tools carry their own server URL, so the org webhook's credential doesn't
      // apply to them — the header is attached here instead.
      server: {
        url: `${appUrl}${def.path}`,
        ...(webhookSecret ? { headers: { "X-Vapi-Secret": webhookSecret } } : {}),
      },
    };
    const found = existing.find((t) => t?.function?.name === def.name);
    if (found?.id) {
      await vapi.tools.update({ id: found.id, body: body as never });
      ids.push(found.id);
    } else {
      const created = (await vapi.tools.create({
        type: "function",
        ...body,
      } as never)) as { id: string };
      ids.push(created.id);
    }
  }
  return ids;
}

// Tells Vapi to extract structured data from every call. The property keys here
// MUST match the keys read in lib/services/calls.ts (StructuredCallData) and the
// enum values must match db/schema/enums.ts (callOutcomeEnum / urgencyLevelEnum).
//
// Vapi deprecated the single-schema `structuredDataPlan` (→ analysis.structuredData)
// in favour of the catalog-based `structuredDataMultiPlan` (→ analysis.structuredDataMulti).
// We register under CALL_DATA_KEY and disable the legacy plan to clear the
// deprecation warning. The webhook reads the result via extractStructuredData().
//
// The core keys are the same for every industry; descriptions and the extra
// intake fields come from the industry profile.
export function callDataSchema(industry: IndustryProfile) {
  const intakeProperties = Object.fromEntries(
    industry.intakeFields.map((f) => [
      f.key,
      { type: "string", description: f.description, ...(f.enum ? { enum: f.enum } : {}) },
    ])
  );
  return {
    type: "object",
    properties: {
      caller_name: {
        type: "string",
        description:
          "The caller's full name as given on the call. Empty string if never provided.",
      },
      issue_summary: {
        type: "string",
        description: industry.issueSummaryDescription,
      },
      urgency_level: {
        type: "string",
        enum: ["emergency", "urgent", "routine", "unknown"],
        description: industry.urgencyDescription,
      },
      service_address: {
        type: "string",
        description: industry.collectsServiceAddress
          ? "The full service address (where the work is needed). Empty string if not provided."
          : "The caller's address, only if they offered it. Empty string otherwise.",
      },
      callback_number: {
        type: "string",
        description:
          "A callback number ONLY if the caller asked to be reached on a number different from the one they are calling from — digits only (e.g. '5805551234'). Leave empty if they want to be called back on the number they are calling from, or if no number was given.",
      },
      outcome: {
        type: "string",
        enum: ["booked", "message_taken", "transferred", "dropped", "abandoned"],
        description:
          "How the call concluded. 'booked' = appointment scheduled; 'message_taken' = message left for the business; 'transferred' = handed to a human; 'dropped' = caller hung up before resolution; 'abandoned' = no meaningful interaction.",
      },
      booking_time: {
        type: "string",
        description:
          "If an appointment was booked, the agreed date and time as a full ISO 8601 timestamp WITH the timezone offset (e.g. '2026-07-03T14:00:00-05:00'). Use the absolute date that was confirmed on the call — it must be in the future, never a past year. Empty string if no booking was made.",
      },
      ...intakeProperties,
    },
    required: ["issue_summary", "urgency_level", "outcome"],
  };
}

function callAnalysisPlan(config: ProvisioningConfig) {
  return {
    // Disable the deprecated single-schema plan.
    structuredDataPlan: { enabled: false },
    // Catalog-based plan (the non-deprecated path).
    structuredDataMultiPlan: [
      {
        key: CALL_DATA_KEY,
        plan: {
          enabled: true,
          schema: callDataSchema(getIndustry(config.industry)),
        },
      },
    ],
  };
}

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

// Turn-taking: when the assistant decides the caller has finished speaking.
// Vapi resolves endpointing in order — customEndpointingRules (if one matches),
// then smartEndpointingPlan — so both are set explicitly rather than relying on
// the transcriber's built-in endpointing. Tuned so callers can pause while
// reading a phone number or address without being cut off.
//
// waitSeconds is left at Vapi's default (0.4s). An assistant-side "address"
// rule (2s wait) and voiceSeconds 0.3 were tried and removed: with them, a
// caller's short "yes" to the address read-back never registered and calls
// ended on silence timeout. Keep rules narrow and test short answers.
const START_SPEAKING_PLAN: Vapi.StartSpeakingPlan = {
  // Semantic end-of-turn model: waits longer when the words suggest the caller
  // isn't done ("my number is 555…"), replies quickly after a finished thought.
  smartEndpointingPlan: { provider: "livekit" },
  customEndpointingRules: [
    // Caller's speech ends in a digit — likely reading a number in chunks.
    { type: "customer", regex: "\\d[\\s.,-]*$", timeoutSeconds: 2.0 },
  ],
};

// Barge-in: when the caller talks over the assistant.
const STOP_SPEAKING_PLAN: Vapi.StopSpeakingPlan = {
  // Pause before the assistant resumes after being interrupted (Vapi default 1s).
  backoffSeconds: 1.5,
};

const VAPI_MODEL = "gpt-4o";

function firstMessageFor(config: ProvisioningConfig): string {
  return `Thank you for calling ${config.businessName}, how can I help you today?`;
}

type VapiToolSummary = { id?: string; type?: string; function?: { name?: string } };

// Line endings and surrounding whitespace aren't meaningful differences.
const normalizeText = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");

// Compares an assistant as Vapi returns it with what the app would push for
// this config. Returns a plain-English problem per difference; empty when the
// assistant matches. Only settings the app owns are compared (the voice, for
// example, is only set at creation, so it's left alone).
export function vapiAssistantProblems(
  assistant: unknown,
  config: ProvisioningConfig,
  tools: VapiToolSummary[]
): string[] {
  const a = (assistant ?? {}) as {
    analysisPlan?: {
      structuredDataMultiPlan?: Array<{ key?: string; plan?: { enabled?: boolean; schema?: { properties?: object } } }>;
    };
    model?: { provider?: string; model?: string; messages?: Array<{ role?: string; content?: string }>; toolIds?: string[] };
    firstMessage?: string;
    startSpeakingPlan?: { smartEndpointingPlan?: unknown };
    stopSpeakingPlan?: { backoffSeconds?: number };
  };
  const problems: string[] = [];

  const multi = a.analysisPlan?.structuredDataMultiPlan;
  const plan = Array.isArray(multi) ? multi.find((p) => p?.key === CALL_DATA_KEY) : undefined;
  if (!plan) {
    problems.push("Call details capture was removed");
  } else {
    const expectedKeys = Object.keys(callDataSchema(getIndustry(config.industry)).properties).sort().join();
    const actualKeys = Object.keys(plan.plan?.schema?.properties ?? {}).sort().join();
    if (plan.plan?.enabled === false || expectedKeys !== actualKeys) problems.push("Call details capture was changed");
  }

  const system = a.model?.messages?.find((m) => m?.role === "system")?.content;
  if (normalizeText(system) !== normalizeText(buildAgentPrompt(config))) problems.push("Instructions were changed");
  if (normalizeText(a.firstMessage) !== normalizeText(firstMessageFor(config))) problems.push("Greeting was changed");
  if (a.model?.provider !== "openai" || a.model?.model !== VAPI_MODEL) problems.push("AI model was changed");

  const nameById = new Map(
    tools.filter((t) => t.id).map((t) => [t.id!, t.type === "transferCall" ? "transferCall" : (t.function?.name ?? t.id!)])
  );
  const actualTools = (a.model?.toolIds ?? []).map((id) => nameById.get(id) ?? `unknown:${id}`).sort().join();
  const expectedTools = [
    ...toolDefsFor(config.calendarType).map((d) => d.name),
    ...(isLiveTransferActive(config) ? ["transferCall"] : []),
  ]
    .sort()
    .join();
  if (actualTools !== expectedTools) problems.push("Tools were changed");

  if (!a.startSpeakingPlan?.smartEndpointingPlan || a.stopSpeakingPlan?.backoffSeconds !== STOP_SPEAKING_PLAN.backoffSeconds) {
    problems.push("Turn-taking settings were changed");
  }
  return problems;
}

// Reads the assistant from Vapi and compares it with the app's settings.
// Read-only. Throws when Vapi can't be reached, so a network blip is never
// mistaken for a broken assistant.
export async function checkVapiAssistant(
  vapi: VapiClient,
  assistantId: string,
  config: ProvisioningConfig
): Promise<string[]> {
  let assistant: unknown;
  try {
    assistant = await vapi.assistants.get({ id: assistantId });
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode === 404) return ["The assistant no longer exists on Vapi"];
    throw new Error(`Couldn't read assistant ${assistantId} — ${extractVapiError(err)}`);
  }
  const listResp = await vapi.tools.list();
  const tools = (Array.isArray(listResp) ? listResp : ((listResp as { data?: unknown[] })?.data ?? [])) as VapiToolSummary[];
  return vapiAssistantProblems(assistant, config, tools);
}

export async function createVapiAssistant(
  vapi: VapiClient,
  config: ProvisioningConfig
): Promise<{ vapiAssistantId: string }> {
  const systemPrompt = buildAgentPrompt(config);

  const toolIds = await toolIdsFor(vapi, config);

  let assistantId: string;
  try {
    const assistant = await vapi.assistants.create({
      name: `${config.businessName} AI Receptionist`,
      model: {
        provider: "openai",
        model: VAPI_MODEL,
        messages: [{ role: "system", content: systemPrompt }],
        toolIds,
      } as any,
      voice: { provider: "11labs", voiceId: "paula" } as any,
      firstMessage: firstMessageFor(config),
      analysisPlan: callAnalysisPlan(config) as any,
      startSpeakingPlan: START_SPEAKING_PLAN,
      stopSpeakingPlan: STOP_SPEAKING_PLAN,
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

export async function provisionVapiPhoneNumber(
  vapi: VapiClient,
  areaCode?: string | null
): Promise<{
  vapiPhoneNumberId: string;
  phoneNumber: string;
}> {

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

// Imports a number we bought on Twilio into Vapi. Vapi then points the
// number's voice webhook at itself, so inbound calls reach the assistant.
export async function importTwilioNumberToVapi(
  vapi: VapiClient,
  opts: { number: string; twilioAccountSid: string; twilioAuthToken: string; name?: string }
): Promise<{ vapiPhoneNumberId: string; phoneNumber: string }> {
  try {
    const pn = await vapi.phoneNumbers.create({
      provider: "twilio",
      number: opts.number,
      twilioAccountSid: opts.twilioAccountSid,
      twilioAuthToken: opts.twilioAuthToken,
      ...(opts.name ? { name: opts.name.slice(0, 40) } : {}),
    } as any);
    return { vapiPhoneNumberId: (pn as any).id, phoneNumber: (pn as any).number ?? opts.number };
  } catch (err) {
    throw new Error(`Failed to import ${opts.number} into Vapi — ${extractVapiError(err)}`);
  }
}

// Provider and number for a Vapi phone-number id, or null if unreadable.
export async function getVapiPhoneNumberInfo(
  vapi: VapiClient,
  id: string
): Promise<{ provider?: string; number?: string; twilioAccountSid?: string } | null> {
  try {
    return (await vapi.phoneNumbers.get({ id })) as any;
  } catch {
    return null;
  }
}

export async function updateVapiAssistant(
  vapi: VapiClient,
  assistantId: string,
  config: ProvisioningConfig
): Promise<void> {
  const systemPrompt = buildAgentPrompt(config);

  const toolIds = await toolIdsFor(vapi, config);

  await vapi.assistants.update({
    id: assistantId,
    name: `${config.businessName} AI Receptionist`,
    model: {
      provider: "openai",
      model: VAPI_MODEL,
      messages: [{ role: "system", content: systemPrompt }],
      toolIds,
    } as any,
    firstMessage: firstMessageFor(config),
    analysisPlan: callAnalysisPlan(config) as any,
    startSpeakingPlan: START_SPEAKING_PLAN,
    stopSpeakingPlan: STOP_SPEAKING_PLAN,
  } as any);

  await verifyAnalysisPlan(vapi, assistantId);
}

// Tears down a customer's Vapi resources when the customer is deleted. Releases
// the phone number first (it points at the assistant), then deletes the
// assistant. Each step is non-fatal so a Vapi hiccup never blocks DB cleanup.
// Deliberately does NOT delete the calendar tools — those are shared across all
// assistants and referenced by other customers via toolIds.
export async function deleteVapiResources(vapi: VapiClient, opts: {
  vapiAssistantId?: string | null;
  vapiPhoneNumberId?: string | null;
}): Promise<void> {

  if (opts.vapiPhoneNumberId) {
    try {
      await vapi.phoneNumbers.delete({ id: opts.vapiPhoneNumberId });
    } catch (err) {
      console.warn(
        `[delete-vapi] phone number ${opts.vapiPhoneNumberId} delete failed — ${extractVapiError(err)}`
      );
    }
  }

  if (opts.vapiAssistantId) {
    try {
      await vapi.assistants.delete({ id: opts.vapiAssistantId });
    } catch (err) {
      console.warn(
        `[delete-vapi] assistant ${opts.vapiAssistantId} delete failed — ${extractVapiError(err)}`
      );
    }
  }
}

// Fetches the phone number currently attached to the assistant straight from
// Vapi (the source of truth), rather than the copy stored in our DB. Looks up by
// phone-number id first, then falls back to scanning the account's numbers for
// one linked to this assistant. Never throws — returns null on any failure so a
// page render can gracefully fall back to the stored value.
export async function getLiveAssistantPhoneNumber(vapi: VapiClient, opts: {
  phoneNumberId?: string | null;
  assistantId?: string | null;
}): Promise<{ number: string; status?: string } | null> {
  try {

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
  vapi: VapiClient,
  vapiPhoneNumberId: string,
  // null unlinks the number from every assistant.
  vapiAssistantId: string | null
): Promise<void> {
  try {
    await vapi.phoneNumbers.update({
      id: vapiPhoneNumberId,
      body: { assistantId: vapiAssistantId } as any,
    });
  } catch (err) {
    throw new Error(`Failed to link phone number to assistant — ${extractVapiError(err)}`);
  }
}
