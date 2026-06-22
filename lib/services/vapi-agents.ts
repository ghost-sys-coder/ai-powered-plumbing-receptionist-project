import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { vapiAgents } from "@/db/schema";

export type AgentLookup = {
    id: string;
    customerId: string;
};

const requestCache = new Map<string, AgentLookup | null>();

export async function getAgentByVapiAssistantId(
    vapiAssistantId: string
): Promise<AgentLookup | null> {
    if (requestCache.has(vapiAssistantId)) {
        return requestCache.get(vapiAssistantId) ?? null;
    }

    const rows = await db
        .select({ id: vapiAgents.id, customerId: vapiAgents.customerId })
        .from(vapiAgents)
        .where(eq(vapiAgents.vapiAssistantId, vapiAssistantId))
        .limit(1);

    const found = rows[0] ?? null;
    requestCache.set(vapiAssistantId, found);
    return found;
}

export function clearAgentLookupCache(): void {
    requestCache.clear();
}