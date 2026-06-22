import crypto from "node:crypto";

import {
    createCall,
    finalizeCall,
    recordCallEndedFallback,
    toDate,
    updateCallTranscript,
    type CreateCallInput,
    type StructuredCallData,
} from "@/lib/services/calls";
import { createBookingFromCall } from "@/lib/services/bookings";
import { getAgentByVapiAssistantId } from "@/lib/services/vapi-agents";

type VapiMessage = {
    type?: string;
    call?: {
        id?: string;
        assistantId?: string;
        customer?: { number?: string | null };
        startedAt?: string;
        endedAt?: string;
    };
    artifact?: {
        transcript?: string | null;
        recordingUrl?: string | null;
    };
    analysis?: {
        structuredData?: StructuredCallData;
    };
    transcript?: string;
    transcriptType?: string;
};

type VapiWebhookPayload = {
    message?: VapiMessage;
};

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
    if (!signature) return false;
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const provided = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(request: Request): Promise<Response> {
    const rawBody = await request.text();

    const skipVerify = process.env.SKIP_VAPI_SIGNATURE_VERIFY === "true";
    if (!skipVerify) {
        const secret = process.env.VAPI_WEBHOOK_SECRET;
        if (!secret) {
            console.error("[vapi-webhook] VAPI_WEBHOOK_SECRET is not set");
            return new Response("Webhook secret not configured", { status: 500 });
        }
        const signature = request.headers.get("x-vapi-signature");
        if (!verifySignature(rawBody, signature, secret)) {
            console.warn("[vapi-webhook] signature verification failed");
            return new Response("Invalid signature", { status: 400 });
        }
    }

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
    const startedAt = toDate(message?.call?.startedAt) ?? new Date();
    const endedAt = toDate(message?.call?.endedAt);

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
                const finalized = await finalizeCall({
                    vapiCallId,
                    startedAt,
                    endedAt,
                    transcript: message?.artifact?.transcript ?? null,
                    audioUrl: message?.artifact?.recordingUrl ?? null,
                    structured: message?.analysis?.structuredData ?? {},
                });
                if (finalized && finalized.outcome === "booked") {
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