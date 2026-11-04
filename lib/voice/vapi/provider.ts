import {
  createVapiAssistant,
  deleteVapiResources,
  getLiveAssistantPhoneNumber,
  getVapi,
  getVapiPhoneNumberInfo,
  importTwilioNumberToVapi,
  linkPhoneNumberToAssistant,
  provisionVapiPhoneNumber,
  updateVapiAssistant,
} from "@/lib/services/vapi-provisioning";
import { getSignedRecordingUrl } from "@/lib/vapi/recording-url";
import { buyLocalNumber, releaseNumber, releaseNumberByPhone, twilioCredsFromEnv } from "@/lib/twilio/numbers";
import { PhoneNumberUnavailableError, numberSourcing } from "../phone-numbers";
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

    async deleteResources(opts) {
      // Numbers we bought on Twilio keep billing until released there, so look
      // the number up before Vapi forgets it.
      const info = opts.phoneNumberId ? await getVapiPhoneNumberInfo(vapi, opts.phoneNumberId) : null;
      await deleteVapiResources(vapi, {
        vapiAssistantId: opts.agentId,
        vapiPhoneNumberId: opts.phoneNumberId,
      });
      if (
        info?.provider === "twilio" &&
        info.number &&
        info.twilioAccountSid &&
        info.twilioAccountSid === process.env.TWILIO_ACCOUNT_SID
      ) {
        await releaseNumberByPhone(info.number);
      }
    },

    async provisionPhoneNumber({ country, areaCode, label }) {
      const sourcing = numberSourcing(country);
      if (sourcing.kind === "unavailable") throw new PhoneNumberUnavailableError(sourcing.reason);

      if (sourcing.kind === "provider") {
        const { vapiPhoneNumberId, phoneNumber } = await provisionVapiPhoneNumber(vapi, areaCode);
        return { phoneNumberId: vapiPhoneNumberId, phoneNumber, source: "vapi_native" };
      }

      const twilioCreds = twilioCredsFromEnv();
      const bought = await buyLocalNumber({
        country: sourcing.country,
        // Area codes only mean something on the North American plan.
        areaCode: sourcing.country === "CA" ? areaCode : null,
        bundleSid: sourcing.bundleSid,
        addressSid: sourcing.addressSid,
        friendlyName: label,
        creds: twilioCreds,
      });
      try {
        const imported = await importTwilioNumberToVapi(vapi, {
          number: bought.phoneNumber,
          twilioAccountSid: twilioCreds.accountSid,
          twilioAuthToken: twilioCreds.authToken,
          name: label,
        });
        return {
          phoneNumberId: imported.vapiPhoneNumberId,
          phoneNumber: imported.phoneNumber,
          source: "twilio_imported",
        };
      } catch (err) {
        // Don't leave a paid number orphaned on Twilio.
        await releaseNumber(bought.sid, twilioCreds);
        throw err;
      }
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
