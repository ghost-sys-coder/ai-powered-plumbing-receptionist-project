import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import { CALENDAR_TOOL_DEFS, NOTIFY_OWNER_TOOL_DEF } from "@/lib/services/vapi-provisioning";
import { buyLocalNumber, clearVoiceUrl, findSpareNumber, releaseNumber, twilioCredsFromEnv } from "@/lib/twilio/numbers";
import { PhoneNumberUnavailableError, isTwilioConfigured } from "../phone-numbers";
import type { ProviderCredentials, ReceptionistProvider } from "../types";
import { ElevenLabsError, elevenLabsApi, type ElevenLabsApi } from "./api";
import { agentBody, toolSecret, webhookToolConfig, type TransferRule } from "./agent-config";

// The ElevenLabs Agents implementation of the provider interface.
//
// Differences from Vapi worth knowing:
// - Tools are workspace objects shared by every agent (like Vapi); they're
//   upserted by name on each create/update so their URL and auth stay current.
// - Live transfer is a built-in tool with the owner's number in the agent
//   itself, so the agent is re-saved when transfer settings change.
// - ElevenLabs has no numbers of its own: every number is a Twilio number
//   imported into it. We reuse an unused number we already own before trying
//   to buy one.
// - Call results arrive once, after the call, on the post-call webhook
//   (app/api/webhooks/elevenlabs). There are no mid-call events.

// Origin our tool endpoints live on. Must be the production app — the tools
// are shared, so a local run must not repoint them at a dev server.
export function toolsBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const url = [env.VOICE_TOOLS_BASE_URL, env.VAPI_TOOLS_BASE_URL, env.NEXT_PUBLIC_APP_URL]
    .map((v) => v?.trim())
    .find(Boolean);
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL (or VOICE_TOOLS_BASE_URL) must be set to register tools");
  return url.replace(/\/$/, "");
}

export const POST_CALL_WEBHOOK_NAME = "Receptionist post-call";

type ToolList = { tools?: Array<{ id: string; tool_config?: { name?: string } }> };
type WebhookList = { webhooks?: Array<{ webhook_id?: string; id?: string; name?: string; webhook_url?: string }> };

// Creates or refreshes our three webhook tools; returns their ids by name.
async function ensureTools(api: ElevenLabsApi, apiKey: string): Promise<Record<string, string>> {
  const baseUrl = toolsBaseUrl();
  const secret = toolSecret(apiKey);
  const existing = (await api<ToolList>("GET", "/v1/convai/tools")).tools ?? [];
  const ids: Record<string, string> = {};
  for (const def of [...CALENDAR_TOOL_DEFS, NOTIFY_OWNER_TOOL_DEF]) {
    const tool_config = webhookToolConfig(def, { baseUrl, secret });
    const found = existing.find((t) => t.tool_config?.name === def.name);
    if (found) {
      await api("PATCH", `/v1/convai/tools/${found.id}`, { tool_config });
      ids[def.name] = found.id;
    } else {
      const created = await api<{ id: string }>("POST", "/v1/convai/tools", { tool_config });
      ids[def.name] = created.id;
    }
  }
  return ids;
}

// The workspace webhook made by scripts/elevenlabs-setup.ts. Agents send their
// post-call events to it. Null (with a warning) until that script has run.
async function postCallWebhookId(api: ElevenLabsApi): Promise<string | null> {
  const list = (await api<WebhookList>("GET", "/v1/workspace/webhooks")).webhooks ?? [];
  const ours = list.find((w) => w.name === POST_CALL_WEBHOOK_NAME);
  const id = ours?.webhook_id ?? ours?.id ?? null;
  if (!id) console.warn("[elevenlabs] post-call webhook missing — run scripts/elevenlabs-setup.ts");
  return id;
}

// The owner number and hours rule for an existing agent, from our database.
async function transferRuleFor(agentId: string): Promise<TransferRule | null> {
  const [row] = await db
    .select({
      enabled: vapiAgents.transferEnabled,
      transferPhone: vapiAgents.transferPhone,
      alertPhone: vapiAgents.alertPhone,
      afterHours: vapiAgents.transferAfterHours,
      agentOwner: vapiAgents.ownerName,
      customerOwner: customers.ownerName,
    })
    .from(vapiAgents)
    .innerJoin(customers, eq(vapiAgents.customerId, customers.id))
    .where(eq(vapiAgents.vapiAssistantId, agentId))
    .limit(1);
  const number = row?.transferPhone || row?.alertPhone;
  if (!row?.enabled || !number) return null;
  return { number, afterHours: row.afterHours, ownerName: row.agentOwner || row.customerOwner };
}

async function takenNumbers(): Promise<Set<string>> {
  const rows = await db.select({ phone: vapiAgents.phoneNumber }).from(vapiAgents);
  return new Set(rows.map((r) => r.phone).filter((p): p is string => !!p));
}

export function createElevenLabsProvider(creds: ProviderCredentials): ReceptionistProvider {
  if (creds.provider !== "elevenlabs") {
    throw new Error(`createElevenLabsProvider called with ${creds.provider} credentials`);
  }
  const api = elevenLabsApi(creds.apiKey);
  const llm = process.env.ELEVENLABS_LLM?.trim() || undefined;

  return {
    id: "elevenlabs",

    async createAgent(config) {
      const [toolIds, webhookId] = await Promise.all([ensureTools(api, creds.apiKey), postCallWebhookId(api)]);
      // A new receptionist has no transfer settings yet; they're added on the
      // first settings save (updateAgent).
      const body = agentBody(config, { toolIds, postCallWebhookId: webhookId, transfer: null, llm });
      const created = await api<{ agent_id: string }>("POST", "/v1/convai/agents/create", body);
      return { agentId: created.agent_id };
    },

    async updateAgent(agentId, config) {
      const [toolIds, webhookId, transfer] = await Promise.all([
        ensureTools(api, creds.apiKey),
        postCallWebhookId(api),
        transferRuleFor(agentId),
      ]);
      const body = agentBody(config, { toolIds, postCallWebhookId: webhookId, transfer, llm });
      await api("PATCH", `/v1/convai/agents/${agentId}`, body);
    },

    async deleteResources({ agentId, phoneNumberId }) {
      // Removing the number from ElevenLabs keeps it on our Twilio account, so
      // it can be reused for the next business.
      if (phoneNumberId) {
        const pn = await api<{ phone_number?: string }>("GET", `/v1/convai/phone-numbers/${phoneNumberId}`).catch(
          () => null
        );
        await api("DELETE", `/v1/convai/phone-numbers/${phoneNumberId}`).catch((err) =>
          console.warn(`[elevenlabs] phone number ${phoneNumberId} delete failed — ${(err as Error).message}`)
        );
        // ElevenLabs leaves its webhook on the Twilio number; clear it so the
        // number shows as free for the next business.
        if (pn?.phone_number && isTwilioConfigured()) await clearVoiceUrl(pn.phone_number);
      }
      if (agentId) {
        await api("DELETE", `/v1/convai/agents/${agentId}`).catch((err) =>
          console.warn(`[elevenlabs] agent ${agentId} delete failed — ${(err as Error).message}`)
        );
      }
    },

    async provisionPhoneNumber({ country, areaCode, label }) {
      if (!isTwilioConfigured()) {
        throw new PhoneNumberUnavailableError("ElevenLabs numbers come from Twilio, which isn't configured.");
      }
      const twilioCreds = twilioCredsFromEnv();

      let number = await findSpareNumber(country, await takenNumbers(), twilioCreds);
      let boughtSid: string | null = null;
      if (!number) {
        if (country === "UG" || country === "GB" || country === "AU") {
          throw new PhoneNumberUnavailableError(
            `There's no spare ${country} number on the Twilio account. Add one there, then use "Add phone number" on the customer page.`
          );
        }
        try {
          const bought = await buyLocalNumber({
            country,
            areaCode: areaCode ?? null,
            friendlyName: label,
            creds: twilioCreds,
          });
          number = bought.phoneNumber;
          boughtSid = bought.sid;
        } catch (err) {
          throw new PhoneNumberUnavailableError(
            `No spare number on the Twilio account, and buying one failed (${(err as Error).message}). ` +
              `Twilio needs the business verified before it sells numbers.`
          );
        }
      }

      let imported: { phone_number_id: string };
      try {
        imported = await api<{ phone_number_id: string }>("POST", "/v1/convai/phone-numbers", {
          phone_number: number,
          label: (label ?? "Receptionist").slice(0, 40),
          sid: twilioCreds.accountSid,
          token: twilioCreds.authToken,
          provider: "twilio",
        });
      } catch (err) {
        // Don't leave a number we just paid for orphaned on Twilio.
        if (boughtSid) await releaseNumber(boughtSid, twilioCreds);
        throw err;
      }
      return { phoneNumberId: imported.phone_number_id, phoneNumber: number, source: "twilio_imported" };
    },

    async attachPhoneNumber(phoneNumberId, agentId) {
      await api("PATCH", `/v1/convai/phone-numbers/${phoneNumberId}`, { agent_id: agentId });
    },

    async detachPhoneNumber(phoneNumberId) {
      await api("PATCH", `/v1/convai/phone-numbers/${phoneNumberId}`, { agent_id: null });
    },

    async getLivePhoneNumber({ phoneNumberId, agentId }) {
      try {
        if (phoneNumberId) {
          const pn = await api<{ phone_number?: string }>("GET", `/v1/convai/phone-numbers/${phoneNumberId}`);
          if (pn?.phone_number) return { number: pn.phone_number };
        }
        if (agentId) {
          const all = await api<Array<{ phone_number?: string; assigned_agent?: { agent_id?: string } | null }>>(
            "GET",
            "/v1/convai/phone-numbers"
          );
          const match = (Array.isArray(all) ? all : []).find((p) => p.assigned_agent?.agent_id === agentId);
          if (match?.phone_number) return { number: match.phone_number };
        }
        return null;
      } catch (err) {
        console.error("[elevenlabs] live phone lookup failed", err);
        return null;
      }
    },

    // ElevenLabs serves call audio only to authenticated requests, so there's
    // no URL to hand the browser; the recording route streams it instead.
    async getRecordingUrl() {
      return null;
    },

    async getRecordingAudio(conversationId) {
      try {
        const res = await api.raw(`/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`);
        if (!res.ok || !res.body) return null;
        return res;
      } catch (err) {
        if (!(err instanceof ElevenLabsError)) console.error("[elevenlabs] audio fetch failed", err);
        return null;
      }
    },
  };
}
