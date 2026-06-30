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

function emptyToNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
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
    callback_number?: string | null;
    outcome?: string | null;
    booking_time?: string | null;
};

// The catalog key our structured-data plan is registered under in Vapi. Used
// both when provisioning the assistant (structuredDataMultiPlan[].key) and when
// reading the result back out of `call.analysis.structuredDataMulti`.
export const CALL_DATA_KEY = "call_details";

type VapiAnalysis = {
    structuredData?: Record<string, unknown> | null;
    // Can arrive as an array (structuredDataMultiPlan) OR as an object keyed by
    // structured-output id (Vapi Structured Outputs) — handle both.
    structuredDataMulti?: unknown;
};

// Fields we recognise as "our" call data, used to pick the right object out of
// whatever container Vapi sends.
const CALL_DATA_FIELDS = [
    "outcome",
    "issue_summary",
    "service_address",
    "caller_name",
    "urgency_level",
    "callback_number",
] as const;

function looksLikeCallData(value: unknown): value is StructuredCallData {
    if (!value || typeof value !== "object") return false;
    return CALL_DATA_FIELDS.some((f) => f in (value as Record<string, unknown>));
}

// Pull candidate data objects out of a single container entry, unwrapping the
// nesting styles Vapi uses:
//   - multiplan output:     { key: "call_details", data: { ...fields } }
//   - keyed object:         { call_details: { ...fields } }
//   - structured outputs:   { name, result: { ...fields } }
function collectCandidates(value: unknown, out: unknown[]): void {
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    if (obj.data && typeof obj.data === "object") out.push(obj.data);
    if (obj.result && typeof obj.result === "object") out.push(obj.result);
    if (obj[CALL_DATA_KEY] && typeof obj[CALL_DATA_KEY] === "object") out.push(obj[CALL_DATA_KEY]);
    out.push(obj);
}

// Vapi deprecated the single `structuredDataPlan` (→ analysis.structuredData) in
// favour of `structuredDataMultiPlan` / Structured Outputs (→ analysis.structuredDataMulti).
// That field shows up in several shapes depending on how the assistant is
// configured, so we gather every candidate object and return the first one that
// carries our known fields. Falls back to the legacy `structuredData`.
export function extractStructuredData(analysis: VapiAnalysis | undefined | null): StructuredCallData {
    if (!analysis) return {};

    const candidates: unknown[] = [];
    const multi = analysis.structuredDataMulti;

    if (Array.isArray(multi)) {
        // [{ call_details: {...} }] or [{ name, result: {...} }] or [{ ...fields }]
        for (const entry of multi) collectCandidates(entry, candidates);
    } else if (multi && typeof multi === "object") {
        // { "<output-id>": { name, result: {...} } }
        for (const entry of Object.values(multi as Record<string, unknown>)) {
            collectCandidates(entry, candidates);
        }
    }

    collectCandidates(analysis.structuredData, candidates);

    const match = candidates.find(looksLikeCallData);
    return (match as StructuredCallData) ?? {};
}

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
    const callerName = emptyToNull(input.structured.caller_name);
    const issueSummary = emptyToNull(input.structured.issue_summary);
    const serviceAddress = emptyToNull(input.structured.service_address);
    const bookingTime = emptyToNull(input.structured.booking_time);
    const callbackNumber = emptyToNull(input.structured.callback_number);

    const duration =
        input.startedAt && input.endedAt
            ? Math.max(0, Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 1000))
            : null;

    const existing = await db
        .select({
            id: calls.id,
            customerId: calls.customerId,
            endedAt: calls.endedAt,
            callerPhone: calls.callerPhone,
        })
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
            // Prefer the real caller ID; fall back to the callback number the
            // agent collected (web/test calls have no caller ID).
            callerPhone: existing[0].callerPhone ?? callbackNumber,
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
