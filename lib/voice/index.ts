import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import { resolveProviderCredentials } from "./credentials";
import { createVapiProvider } from "./vapi/provider";
import {
  isVoiceProviderId,
  type ProviderCredentials,
  type ReceptionistProvider,
  type VoiceProviderId,
} from "./types";

export * from "./types";
export { resolveProviderCredentials } from "./credentials";

// The provider new receptionists are created on until onboarding lets a
// business choose.
export const DEFAULT_VOICE_PROVIDER: VoiceProviderId = "vapi";

export function createProvider(creds: ProviderCredentials): ReceptionistProvider {
  switch (creds.provider) {
    case "vapi":
      return createVapiProvider(creds);
    case "elevenlabs":
      // Adapter lands in a later step (docs/phase-8-saas-platform.md §4).
      throw new Error("The ElevenLabs provider isn't available yet");
  }
}

// A provider client for an agency, with that agency's credentials.
export async function getProvider(
  provider: VoiceProviderId,
  organizationId: string | null
): Promise<ReceptionistProvider> {
  return createProvider(await resolveProviderCredentials(provider, organizationId));
}

// The provider a customer's receptionist runs on, plus its ids there.
// Null when the customer has no agent yet.
export async function getCustomerReceptionist(customerId: string): Promise<{
  provider: ReceptionistProvider;
  agentId: string;
  phoneNumberId: string | null;
} | null> {
  const [row] = await db
    .select({
      provider: vapiAgents.provider,
      agentId: vapiAgents.vapiAssistantId,
      phoneNumberId: vapiAgents.vapiPhoneNumberId,
      organizationId: customers.organizationId,
    })
    .from(vapiAgents)
    .innerJoin(customers, eq(vapiAgents.customerId, customers.id))
    .where(eq(vapiAgents.customerId, customerId))
    .limit(1);
  if (!row) return null;

  const providerId = isVoiceProviderId(row.provider) ? row.provider : DEFAULT_VOICE_PROVIDER;
  return {
    provider: await getProvider(providerId, row.organizationId),
    agentId: row.agentId,
    phoneNumberId: row.phoneNumberId,
  };
}
