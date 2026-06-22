import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calls } from "@/db/schema";

type CallOutcome = "booked" | "message_taken" | "transferred" | "dropped" | "abandoned";
type UrgencyLevel = "emergency" | "urgent" | "routine" | "unknown";

const OUTCOME_VALUES = new Set<CallOutcome>([
    "booked",
    "message_taken",
    "transferred",
    "dropped",
    "abandoned",
]);

const URGENCY_VALUES = new Set<UrgencyLevel>([
    "emergency",
    "urgent",
    "routine",
    "unknown",
]);

function safeOutcome(value: unknown): CallOutcome {
    return typeof value === "string" && OUTCOME_VALUES.has(value as CallOutcome)
        ? (value as CallOutcome)
        : "message_taken";
}

function safeUrgency(value: unknown): UrgencyLevel {
    return typeof value === "string" && URGENCY_VALUES.has(value as UrgencyLevel)
        ? (value as UrgencyLevel)
        : "unknown";
}

function toDate(value: unknown): Date | null {
    if (!value) return null;
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : d;
}

export type CreateCallInput = {
    vapiCallId: string;
    customerId: string;
    vapiAgentId: string;
    callerPhone: string | null;
    startedAt: Date;
};

export async function createCall(input: CreateCallInput): Promise<void> {
    try {
        await db
            .insert(calls)
            .values({
                vapiCallId: input.vapiCallId,
                customerId: input.customerId,
                vapiAgentId: input.vapiAgentId,
                callerPhone: input.callerPhone,
                startedAt: input.startedAt,
            })
            .onConflictDoNothing({ target: calls.vapiCallId });
    } catch (err) {
        throw new Error(
            `createCall failed for ${input.vapiCallId}: ${(err as Error).message}`
        );
    }
}

export async function updateCallTranscript(
    vapiCallId: string,
    chunk: string,
    fallback?: CreateCallInput
): Promise<void> {
    if (!chunk) return;

    const existing = await db
        .select({ id: calls.id })
        .from(calls)
        .where(eq(calls.vapiCallId, vapiCallId))
        .limit(1);

    if (existing.length === 0) {
        if (!fallback) return;
        await createCall(fallback);
    }

    await db
        .update(calls)
        .set({ transcript: sql`COALESCE(${calls.transcript}, '') || ${chunk}` })
        .where(eq(calls.vapiCallId, vapiCallId));
}

export type StructuredCallData = {
    caller_name?: string | null;
    issue_summary?: string | null;
    urgency_level?: string | null;
    service_address?: string | null;
    outcome?: string | null;
    booking_time?: string | null;
};

export type FinalizeCallInput = {
    vapiCallId: string;
    endedAt: Date | null;
    startedAt: Date | null;
    transcript: string | null;
    audioUrl: string | null;
    structured: StructuredCallData;
};

export type FinalizedCall = {
    callId: string;
    customerId: string;
    outcome: CallOutcome;
    bookingTime: string | null;
    callerName: string | null;
    serviceAddress: string | null;
};

export async function finalizeCall(input: FinalizeCallInput): Promise<FinalizedCall | null> {
    const outcome = safeOutcome(input.structured.outcome);
    const urgency = safeUrgency(input.structured.urgency_level);
    const callerName = input.structured.caller_name ?? null;
    const issueSummary = input.structured.issue_summary ?? null;
    const serviceAddress = input.structured.service_address ?? null;
    const bookingTime = input.structured.booking_time ?? null;

    const duration =
        input.startedAt && input.endedAt
            ? Math.max(0, Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 1000))
            : null;

    const existing = await db
        .select({ id: calls.id, customerId: calls.customerId, endedAt: calls.endedAt })
        .from(calls)
        .where(eq(calls.vapiCallId, input.vapiCallId))
        .limit(1);

    if (existing.length === 0) {
        console.warn(`[finalizeCall] no row for ${input.vapiCallId}, skipping`);
        return null;
    }

    if (existing[0].endedAt) {
        console.log(`[finalizeCall] ${input.vapiCallId} already finalized, skipping`);
        return {
            callId: existing[0].id,
            customerId: existing[0].customerId,
            outcome,
            bookingTime,
            callerName,
            serviceAddress,
        };
    }

    await db
        .update(calls)
        .set({
            endedAt: input.endedAt,
            durationSeconds: duration,
            transcript: input.transcript ?? sql`${calls.transcript}`,
            audioUrl: input.audioUrl,
            outcome,
            urgencyLevel: urgency,
            callerName,
            issueSummary,
            serviceAddress,
        })
        .where(eq(calls.vapiCallId, input.vapiCallId));

    return {
        callId: existing[0].id,
        customerId: existing[0].customerId,
        outcome,
        bookingTime,
        callerName,
        serviceAddress,
    };
}

export async function recordCallEndedFallback(
    vapiCallId: string,
    endedAt: Date | null
): Promise<void> {
    if (!endedAt) return;

    await db
        .update(calls)
        .set({
            endedAt,
            durationSeconds: sql`EXTRACT(EPOCH FROM (${endedAt.toISOString()}::timestamptz - ${calls.startedAt}))::integer`,
        })
        .where(and(eq(calls.vapiCallId, vapiCallId), isNull(calls.endedAt)));
}

export { toDate };
