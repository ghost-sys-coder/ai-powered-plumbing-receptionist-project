import {
    createCall,
    extractStructuredData,
    finalizeCall,
    recordCallEndedFallback,
    toDate,
    updateCallTranscript,
    type CreateCallInput,
} from "@/lib/services/calls";
import { createBookingFromCall } from "@/lib/services/bookings";
import { getAgentByVapiAssistantId } from "@/lib/services/vapi-agents";
import { checkVapiSignature } from "@/lib/vapi/verify-signature";

type VapiMessage = {
    type?: string;
    call?: {
        id?: string;
        assistantId?: string;
        customer?: { number?: string | null };
        startedAt?: string;
        endedAt?: string;
    };
    // On end-of-call-report the timestamps live at the top level of the
    // message, not under `call`.
    startedAt?: string;
    endedAt?: string;
    artifact?: {
        transcript?: string | null;
        recordingUrl?: string | null;
    };
    analysis?: {
        structuredData?: Record<string, unknown> | null;
        structuredDataMulti?: unknown;
    };
    transcript?: string;
    transcriptType?: string;
};

type VapiWebhookPayload = {
    message?: VapiMessage;
};

export async function POST(request: Request): Promise<Response> {
    const rawBody = await request.text();

    const unauthorized = checkVapiSignature(request, rawBody);
    if (unauthorized) return unauthorized;

    let payload: VapiWebhookPayload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    const message = payload.message;
    const type = message?.type;
    const vapiCallId = message?.call?.id;
    const assistantId = message?.call?.assistantId;

    if (!type || !vapiCallId || !assistantId) {
        console.warn("[vapi-webhook] missing required fields", { type, vapiCallId, assistantId });
        return new Response("ok", { status: 200 });
    }

    const agent = await getAgentByVapiAssistantId(assistantId);
    if (!agent) {
        console.warn(`[vapi-webhook] unknown assistantId ${assistantId}, ignoring ${type}`);
        return new Response("ok", { status: 200 });
    }

    const callerPhone = message?.call?.customer?.number ?? null;
    // Prefer top-level timestamps (present on end-of-call-report); fall back to
    // the ones nested under `call` for other events.
    const startedAt =
        toDate(message?.startedAt) ?? toDate(message?.call?.startedAt) ?? new Date();
    const endedAt = toDate(message?.endedAt) ?? toDate(message?.call?.endedAt);

    const baseCallInput: CreateCallInput = {
        vapiCallId,
        vapiAgentId: agent.id,
        customerId: agent.customerId,
        callerPhone,
        startedAt,
    };

    console.log(`[vapi-webhook] ${type} for call ${vapiCallId}`);

    try {
        switch (type) {
            case "call-started":
                await createCall(baseCallInput);
                break;

            case "transcript": {
                // skip partial mid-sentence chunks — only append final chunks
                if (message?.transcriptType !== "final") break;
                const chunk = message?.transcript ?? "";
                await updateCallTranscript(vapiCallId, chunk, baseCallInput);
                break;
            }

            case "end-of-call-report": {
                await createCall(baseCallInput);

                const extracted = extractStructuredData(message?.analysis);
                console.log(
                    `[vapi-webhook] end-of-call-report ${vapiCallId} — raw analysis:`,
                    JSON.stringify(message?.analysis, null, 2)
                );
                console.log(
                    `[vapi-webhook] end-of-call-report ${vapiCallId} — extracted structured data:`,
                    JSON.stringify(extracted, null, 2)
                );

                const finalized = await finalizeCall({
                    vapiCallId,
                    startedAt,
                    endedAt,
                    transcript: message?.artifact?.transcript ?? null,
                    audioUrl: message?.artifact?.recordingUrl ?? null,
                    structured: extracted,
                });
                // For Google-Calendar customers, book_appointment is the sole
                // source of truth (it creates the real calendar event). Creating a
                // booking here from the transcript would produce phantom rows with
                // no calendar event when the caller hangs up mid-booking. Only the
                // manual flow records bookings from the end-of-call outcome.
                if (
                    finalized &&
                    finalized.outcome === "booked" &&
                    agent.calendarType !== "google_calendar"
                ) {
                    await createBookingFromCall({
                        callId: finalized.callId,
                        customerId: finalized.customerId,
                        bookingTime: finalized.bookingTime,
                    });
                }
                break;
            }

            case "call-ended":
                await recordCallEndedFallback(vapiCallId, endedAt);
                break;

            default:
                console.log(`[vapi-webhook] ignoring event ${type}`);
        }
    } catch (err) {
        console.error(`[vapi-webhook] handler failed for ${type} on ${vapiCallId}`, err);
        return new Response("Handler error", { status: 500 });
    }

    return new Response("ok", { status: 200 });
}