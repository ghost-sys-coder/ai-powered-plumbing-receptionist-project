import {
  createVapiAssistant,
  deleteVapiResources,
  getLiveAssistantPhoneNumber,
  getVapi,
  linkPhoneNumberToAssistant,
  provisionVapiPhoneNumber,
  updateVapiAssistant,
} from "@/lib/services/vapi-provisioning";
import { getSignedRecordingUrl } from "@/lib/vapi/recording-url";
import type { ProviderCredentials, ReceptionistProvider } from "../types";

// Vapi implementation of the provider interface. Everything runs against the
// account the credentials belong to — the platform's today, an agency's own
// under bring-your-own-key — including the shared tools, which ensureToolIds
// creates per account.
export function createVapiProvider(creds: ProviderCredentials): ReceptionistProvider {
  if (creds.provider !== "vapi") {
    throw new Error(`createVapiProvider called with ${creds.provider} credentials`);
  }
  const vapi = getVapi(creds.apiKey);

  return {
    id: "vapi",

    async createAgent(config) {
      const { vapiAssistantId } = await createVapiAssistant(vapi, config);
      return { agentId: vapiAssistantId };
    },

    updateAgent: (agentId, config) => updateVapiAssistant(vapi, agentId, config),

    deleteResources: (opts) =>
      deleteVapiResources(vapi, {
        vapiAssistantId: opts.agentId,
        vapiPhoneNumberId: opts.phoneNumberId,
      }),

    async provisionPhoneNumber(areaCode) {
      const { vapiPhoneNumberId, phoneNumber } = await provisionVapiPhoneNumber(vapi, areaCode);
      return { phoneNumberId: vapiPhoneNumberId, phoneNumber };
    },

    attachPhoneNumber: (phoneNumberId, agentId) =>
      linkPhoneNumberToAssistant(vapi, phoneNumberId, agentId),

    getLivePhoneNumber: (opts) =>
      getLiveAssistantPhoneNumber(vapi, {
        phoneNumberId: opts.phoneNumberId,
        assistantId: opts.agentId,
      }),

    getRecordingUrl: (providerCallId) => getSignedRecordingUrl(providerCallId, creds.apiKey),
  };
}
