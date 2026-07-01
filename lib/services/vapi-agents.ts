import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { vapiAgents, customers } from "@/db/schema";

export type AgentLookup = {
    id: string;
    customerId: string;
};

export type AgentBookingContext = {
    vapiAgentId: string;
    customerId: string;
    calendarId: string | null;
    calendarType: "google_calendar" | "manual";
    appointmentDurationMinutes: number;
    appointmentBufferMinutes: number;
    businessHours: unknown;
    timezone: string;
};

// Everything the calendar tools need, resolved from the assistant id in one join.
export async function getAgentBookingContext(
    vapiAssistantId: string
): Promise<AgentBookingContext | null> {
    const rows = await db
        .select({
            vapiAgentId: vapiAgents.id,
            customerId: vapiAgents.customerId,
            calendarId: vapiAgents.calendarId,
            calendarType: vapiAgents.calendarType,
            appointmentDurationMinutes: vapiAgents.appointmentDurationMinutes,
            appointmentBufferMinutes: vapiAgents.appointmentBufferMinutes,
            businessHours: vapiAgents.businessHours,
            timezone: customers.timezone,
        })
        .from(vapiAgents)
        .innerJoin(customers, eq(vapiAgents.customerId, customers.id))
        .where(eq(vapiAgents.vapiAssistantId, vapiAssistantId))
        .limit(1);

    return rows[0] ?? null;
}

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