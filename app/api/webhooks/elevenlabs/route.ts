import { reportCallUsage } from "@/lib/billing/usage";
import { textCallSummary } from "@/lib/services/call-summary-text";
import { createBookingFromCall } from "@/lib/services/bookings";
import { createCall, finalizeCall, pickIntakeData } from "@/lib/services/calls";
import { getAgentByVapiAssistantId } from "@/lib/services/vapi-agents";
import { getIndustry } from "@/lib/verticals";
import { parsePostCall, verifyElevenLabsSignature, type PostCallPayload } from "@/lib/voice/elevenlabs/webhook";

// ElevenLabs post-call webhook: one event per finished call, carrying the
// transcript and the extracted call details. Feeds the same pipeline as the
// Vapi end-of-call report (calls row, usage billing, booking, summary text).
//
// Always answers 200 for events we can't use: ElevenLabs disables webhooks
// that keep failing.
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[elevenlabs-webhook] ELEVENLABS_WEBHOOK_SECRET is not set");
    return new Response("Not configured", { status: 503 });
  }
  if (!verifyElevenLabsSignature(rawBody, request.headers.get("elevenlabs-signature"), secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: PostCallPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const call = parsePostCall(payload);
  if (!call) return new Response("ok", { status: 200 }); // audio, initiation failures, …

  const agent = await getAgentByVapiAssistantId(call.agentId);
  if (!agent) {
    console.warn(`[elevenlabs-webhook] unknown agent ${call.agentId}, ignoring ${call.conversationId}`);
    return new Response("ok", { status: 200 });
  }

  try {
    // A tool may already have created the row mid-call; createCall is a no-op then.
    await createCall({
      vapiCallId: call.conversationId,
      vapiAgentId: agent.id,
      customerId: agent.customerId,
      callerPhone: call.callerPhone,
      startedAt: call.startedAt,
    });

    const finalized = await finalizeCall({
      vapiCallId: call.conversationId,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      transcript: call.transcript,
      // The recording lives in ElevenLabs (fetched with our key by the
      // recording route); this marks that there is one.
      audioUrl: call.hasAudio ? `elevenlabs:${call.conversationId}` : null,
      structured: call.structured,
      intakeData: pickIntakeData(call.structured, getIndustry(agent.industry).intakeFields),
    });

    if (finalized) {
      await reportCallUsage(finalized.callId);
      await textCallSummary(finalized.callId);
      // Calendar customers book through the book_appointment tool; only the
      // manual flow records bookings from the call outcome (as for Vapi).
      if (finalized.outcome === "booked" && agent.calendarType !== "google_calendar") {
        await createBookingFromCall({
          callId: finalized.callId,
          customerId: finalized.customerId,
          bookingTime: finalized.bookingTime,
        });
      }
    }
    console.log(`[elevenlabs-webhook] finalized ${call.conversationId} (${finalized?.outcome ?? "?"})`);
  } catch (err) {
    console.error(`[elevenlabs-webhook] processing ${call.conversationId} failed:`, err);
    // 500 so ElevenLabs retries; finalizeCall and the billing/text claims are idempotent.
    return new Response("Error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
