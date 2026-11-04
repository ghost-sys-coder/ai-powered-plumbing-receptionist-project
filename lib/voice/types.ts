import type { PromptConfig } from "@/lib/templates/agent-prompt";
import type { CountryCode } from "@/lib/regions";

export type ProvisionedNumber = {
  phoneNumberId: string;
  phoneNumber: string;
  // Matches vapi_agents.phone_number_source.
  source: "vapi_native" | "twilio_imported";
};

// The voice platforms a receptionist can run on. Each customer's agent row
// records which one it uses (vapi_agents.provider).
export const VOICE_PROVIDER_IDS = ["vapi", "elevenlabs"] as const;
export type VoiceProviderId = (typeof VOICE_PROVIDER_IDS)[number];

export function isVoiceProviderId(value: unknown): value is VoiceProviderId {
  return typeof value === "string" && (VOICE_PROVIDER_IDS as readonly string[]).includes(value);
}

// Whose account a request runs against: ours (platform-managed) or an agency's
// own (bring-your-own-key).
export type ProviderCredentials = {
  provider: VoiceProviderId;
  apiKey: string;
  source: "platform" | "agency";
};

// Everything the app asks of a voice platform to run one business's
// receptionist. Inbound traffic (webhooks, mid-call tool calls) is handled by
// per-provider route adapters that call the provider-neutral handlers in
// lib/voice/tools.
export interface ReceptionistProvider {
  readonly id: VoiceProviderId;

  createAgent(config: PromptConfig): Promise<{ agentId: string }>;
  updateAgent(agentId: string, config: PromptConfig): Promise<void>;
  // Best-effort teardown; never throws, so a provider hiccup can't block
  // deleting the customer from our database.
  deleteResources(opts: { agentId?: string | null; phoneNumberId?: string | null }): Promise<void>;

  // Issues a local number for the business's country (see phone-numbers.ts).
  // Throws PhoneNumberUnavailableError when the country can't be served yet.
  provisionPhoneNumber(opts: {
    country: CountryCode;
    areaCode?: string | null;
    label?: string;
  }): Promise<ProvisionedNumber>;
  attachPhoneNumber(phoneNumberId: string, agentId: string): Promise<void>;
  // The number currently attached to the agent, read from the provider (the
  // source of truth). Never throws; null when unknown.
  getLivePhoneNumber(opts: {
    phoneNumberId?: string | null;
    agentId?: string | null;
  }): Promise<{ number: string; status?: string } | null>;

  // A short-lived URL the browser can play, or null if there's no recording.
  getRecordingUrl(providerCallId: string): Promise<string | null>;
}
