import type { ProviderCredentials, VoiceProviderId } from "./types";

const PLATFORM_KEY_ENV: Record<VoiceProviderId, string> = {
  vapi: "VAPI_API_KEY",
  elevenlabs: "ELEVENLABS_API_KEY",
};

// Credentials for calling a provider on behalf of an agency.
//
// Today every agency runs on the platform's own accounts. Bring-your-own-key
// (docs/phase-8-saas-platform.md §5) slots in here: look up the agency's
// stored, encrypted key for this provider first and return it with
// source "agency"; fall back to the platform key otherwise. Every provider
// call already goes through this function, so callers won't change.
export async function resolveProviderCredentials(
  provider: VoiceProviderId,
  // Unused until BYOK; accepted now so call sites are already agency-aware.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _organizationId?: string | null
): Promise<ProviderCredentials> {
  const envName = PLATFORM_KEY_ENV[provider];
  const apiKey = process.env[envName];
  if (!apiKey) throw new Error(`${envName} is not set`);
  return { provider, apiKey, source: "platform" };
}
