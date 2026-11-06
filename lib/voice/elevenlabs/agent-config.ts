import { createHmac } from "crypto";
import { buildAgentPrompt, isLiveTransferActive, type PromptConfig } from "@/lib/templates/agent-prompt";
import { callDataSchema, toolDefsFor, type ToolDef } from "@/lib/services/vapi-provisioning";
import { getIndustry } from "@/lib/verticals";
import type { CountryCode } from "@/lib/regions";

// Pure builders for ElevenLabs request bodies, kept apart from the network
// code so they can be tested.

// The model that runs the conversation. Fast with reliable tool calling;
// override per deployment with ELEVENLABS_LLM.
export const DEFAULT_LLM = "gpt-4.1-mini";

// A premade voice per accent (ElevenLabs voice library ids).
// Checked against the premade library (Nov 2026).
export const VOICES: Partial<Record<CountryCode, string>> & { default: string } = {
  default: "hpp4J3VqNfWAUOO0d1Us", // Bella — American, professional, warm
  GB: "Xb7hH8MSUJpSbSDYk0k2", // Alice — British, clear
  AU: "IKne3meq5aSn9XLyUdCD", // Charlie — Australian, conversational (the only premade AU voice)
};

export function voiceFor(country: CountryCode | null | undefined, env: Record<string, string | undefined> = process.env): string {
  return env.ELEVENLABS_VOICE_ID || (country && VOICES[country]) || VOICES.default;
}

// Shared secret ElevenLabs sends with every tool call. Derived from the API
// key, so there's no extra env var to keep in sync: anyone holding the key
// already controls the agents.
export function toolSecret(apiKey: string): string {
  return createHmac("sha256", apiKey).update("receptionist-tool-auth").digest("hex");
}
export const TOOL_SECRET_HEADER = "X-Receptionist-Secret";

// Path of our endpoint for each tool, on whatever origin hosts the app.
export function toolPath(name: string): string {
  return `/api/elevenlabs/tools/${name.replace(/_/g, "-")}`;
}

type JsonSchemaProp = { type: string; description?: string; enum?: string[] };

// A webhook tool definition for ElevenLabs, from our shared tool definition.
// The model fills the tool's own parameters; ElevenLabs fills in which agent
// and conversation the call belongs to, and the caller's number.
export function webhookToolConfig(def: ToolDef, opts: { baseUrl: string; secret: string }) {
  const properties: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(def.parameters.properties as Record<string, JsonSchemaProp>)) {
    properties[key] = { type: prop.type, description: prop.description };
  }
  properties.conversation_id = { type: "string", dynamic_variable: "system__conversation_id" };
  properties.agent_id = { type: "string", dynamic_variable: "system__agent_id" };
  properties.caller_id = { type: "string", dynamic_variable: "system__caller_id" };
  return {
    type: "webhook",
    name: def.name,
    description: def.description,
    response_timeout_secs: 20,
    api_schema: {
      url: `${opts.baseUrl}${toolPath(def.name)}`,
      method: "POST",
      request_headers: { [TOOL_SECRET_HEADER]: opts.secret },
      request_body_schema: {
        type: "object",
        properties,
        required: [...def.parameters.required, "conversation_id", "agent_id"],
      },
    },
  };
}

// What we ask ElevenLabs to extract from every call: the same fields (and
// keys) as the Vapi structured-data plan, so both feed finalizeCall alike.
export function dataCollection(config: PromptConfig) {
  const schema = callDataSchema(getIndustry(config.industry));
  return Object.fromEntries(
    Object.entries(schema.properties as Record<string, JsonSchemaProp>).map(([key, prop]) => [
      key,
      { type: "string", description: prop.description, ...(prop.enum ? { enum: prop.enum } : {}) },
    ])
  );
}

export type TransferRule = {
  number: string;
  // When false, transfers are only offered during business hours.
  afterHours: boolean;
  ownerName: string;
};

// The built-in transfer tool, with the owner's number baked in (each business
// has its own ElevenLabs agent, unlike Vapi's shared transfer tool).
export function transferTool(rule: TransferRule) {
  const when = rule.afterHours
    ? "at any time"
    : "only during the business hours listed in your instructions; outside them, don't transfer";
  return {
    type: "system",
    name: "transfer_to_number",
    description: `Connect an emergency caller to ${rule.ownerName}, ${when}.`,
    params: {
      system_tool_type: "transfer_to_number",
      transfers: [
        {
          transfer_destination: { type: "phone", phone_number: rule.number },
          condition: `The caller has an emergency and agreed to be connected to ${rule.ownerName} (${when}).`,
          transfer_type: "conference",
        },
      ],
    },
  };
}

// The full agent body, for create and update alike.
export function agentBody(
  config: PromptConfig,
  opts: {
    toolIds: Record<string, string>;
    postCallWebhookId: string | null;
    transfer: TransferRule | null;
    llm?: string;
  }
) {
  const elConfig: PromptConfig = { ...config, platform: "elevenlabs" };
  const toolIds = toolDefsFor(config.calendarType)
    .map((d) => opts.toolIds[d.name])
    .filter(Boolean);
  const transfer = isLiveTransferActive(config) && opts.transfer ? transferTool(opts.transfer) : null;

  return {
    name: `${config.businessName} AI Receptionist`,
    tags: ["receptionist"],
    conversation_config: {
      agent: {
        first_message: `Thank you for calling ${config.businessName}, how can I help you today?`,
        language: "en",
        prompt: {
          prompt: buildAgentPrompt(elConfig),
          llm: opts.llm ?? DEFAULT_LLM,
          temperature: 0.3,
          timezone: config.timezone,
          tool_ids: toolIds,
          built_in_tools: {
            end_call: { type: "system", name: "end_call", description: "", params: { system_tool_type: "end_call" } },
            transfer_to_number: transfer,
          },
        },
      },
      tts: { voice_id: voiceFor(config.country) },
      // Callers pause while reading out numbers and addresses; don't jump in.
      turn: { turn_eagerness: "patient" },
    },
    platform_settings: {
      data_collection: dataCollection(config),
      ...(opts.postCallWebhookId
        ? {
            workspace_overrides: {
              webhooks: { post_call_webhook_id: opts.postCallWebhookId, events: ["transcript"], transcript_format: "json" },
            },
          }
        : {}),
    },
  };
}
