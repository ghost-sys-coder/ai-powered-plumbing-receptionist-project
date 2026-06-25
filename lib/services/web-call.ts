import { db } from "@/db/drizzle";
import { vapiAgents } from "@/db/schema";
import { eq } from "drizzle-orm";

type WebCallSessionResult =
  | { ok: true; assistantId: string }
  | { ok: false; status: 400 | 404 | 502; error: string };

export async function createWebCallToken(
  customerId: string
): Promise<WebCallSessionResult> {
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

  if (!process.env.NEXT_PUBLIC_VAPI_KEY) {
    return { ok: false, status: 502, error: "NEXT_PUBLIC_VAPI_KEY is not configured" };
  }

  return { ok: true, assistantId: agent.vapiAssistantId };
}
