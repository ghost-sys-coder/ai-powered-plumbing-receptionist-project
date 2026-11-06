import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveProviderCredentials } from "@/lib/voice";
import { elevenLabsApi } from "@/lib/voice/elevenlabs/api";

// What the browser needs to start a test call with a customer's receptionist.
//   vapi       — the assistant id; the browser uses the public Vapi key
//   elevenlabs — a short-lived signed session URL, so our API key never
//                reaches the browser
export type WebCallSession =
  | { provider: "vapi"; assistantId: string }
  | { provider: "elevenlabs"; signedUrl: string };

type WebCallSessionResult =
  | ({ ok: true } & WebCallSession)
  | { ok: false; status: 400 | 404 | 502; error: string };

export async function createWebCallToken(customerId: string): Promise<WebCallSessionResult> {
  const [agent] = await db
    .select({
      agentId: vapiAgents.vapiAssistantId,
      status: vapiAgents.status,
      provider: vapiAgents.provider,
      organizationId: customers.organizationId,
    })
    .from(vapiAgents)
    .innerJoin(customers, eq(vapiAgents.customerId, customers.id))
    .where(eq(vapiAgents.customerId, customerId))
    .limit(1);

  if (!agent) {
    return { ok: false, status: 404, error: "No agent found for this customer" };
  }

  if (agent.status !== "active") {
    return { ok: false, status: 400, error: "Agent is not active" };
  }

  if (agent.provider === "elevenlabs") {
    try {
      const creds = await resolveProviderCredentials("elevenlabs", agent.organizationId);
      const { signed_url } = await elevenLabsApi(creds.apiKey)<{ signed_url: string }>(
        "GET",
        `/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agent.agentId)}`
      );
      return { ok: true, provider: "elevenlabs", signedUrl: signed_url };
    } catch (err) {
      console.error("[web-call] ElevenLabs signed URL failed", err);
      return { ok: false, status: 502, error: "Couldn't start an ElevenLabs test call" };
    }
  }

  if (!process.env.NEXT_PUBLIC_VAPI_KEY) {
    return { ok: false, status: 502, error: "NEXT_PUBLIC_VAPI_KEY is not configured" };
  }

  return { ok: true, provider: "vapi", assistantId: agent.agentId };
}
