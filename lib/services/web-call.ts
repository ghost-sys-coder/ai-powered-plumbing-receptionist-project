import { db } from "@/db/drizzle";
import { vapiAgents } from "@/db/schema";
import { eq } from "drizzle-orm";

type WebCallTokenResult =
  | { ok: true; token: string; callId: string }
  | { ok: false; status: 400 | 404 | 502; error: string };

export async function createWebCallToken(
  customerId: string
): Promise<WebCallTokenResult> {
  const [agent] = await db
    .select({
      vapiAssistantId: vapiAgents.vapiAssistantId,
      status: vapiAgents.status,
    })
    .from(vapiAgents)
    .where(eq(vapiAgents.customerId, customerId))
    .limit(1);

  if (!agent) {
    return { ok: false, status: 404, error: "No agent found for this customer" };
  }

  if (agent.status !== "active") {
    return { ok: false, status: 400, error: "Agent is not active" };
  }

  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 502, error: "VAPI_API_KEY is not configured" };
  }

  const response = await fetch("https://api.vapi.ai/call/web", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assistantId: agent.vapiAssistantId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("[web-call] Vapi API error", error);
    return { ok: false, status: 502, error: "Failed to create web call" };
  }

  const data = await response.json();
  // Vapi returns either a token or a webCallUrl depending on SDK version
  const token: string = data.token ?? data.webCallUrl ?? "";
  const callId: string = data.id ?? "";

  if (!token) {
    console.error("[web-call] Vapi response missing token/webCallUrl", data);
    return { ok: false, status: 502, error: "Invalid response from Vapi" };
  }

  return { ok: true, token, callId };
}
