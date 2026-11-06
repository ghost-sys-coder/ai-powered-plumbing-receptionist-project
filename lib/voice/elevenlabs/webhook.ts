import { createHmac, timingSafeEqual } from "crypto";
import type { StructuredCallData } from "@/lib/services/calls";

// ElevenLabs signs webhooks as "ElevenLabs-Signature: t=<unix secs>,v0=<hex>"
// where hex = HMAC-SHA256(secret, `${t}.${rawBody}`). Same scheme as their SDK's
// constructEvent, including its 30-minute replay window.
const MAX_AGE_SECS = 30 * 60;

export function verifyElevenLabsSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSecs: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",");
  const t = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v0 = parts.find((p) => p.startsWith("v0="))?.slice(3);
  if (!t || !v0 || !/^\d+$/.test(t)) return false;
  if (nowSecs - Number(t) > MAX_AGE_SECS) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v0);
  return a.length === b.length && timingSafeEqual(a, b);
}

type TranscriptTurn = { role?: string; message?: string | null };
type DataCollectionResult = { value?: unknown };

export type PostCallPayload = {
  type?: string;
  data?: {
    agent_id?: string;
    conversation_id?: string;
    status?: string;
    has_audio?: boolean;
    transcript?: TranscriptTurn[];
    metadata?: {
      start_time_unix_secs?: number;
      call_duration_secs?: number;
      phone_call?: { external_number?: string | null } | null;
    };
    analysis?: {
      transcript_summary?: string | null;
      data_collection_results?: Record<string, DataCollectionResult>;
    };
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, unknown>;
    };
  };
};

export type ParsedPostCall = {
  agentId: string;
  conversationId: string;
  callerPhone: string | null;
  startedAt: Date;
  endedAt: Date;
  transcript: string | null;
  hasAudio: boolean;
  structured: StructuredCallData & Record<string, string | null>;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// "AI: …" / "Caller: …" lines — the format the dashboard transcript expects
// (and Vapi's artifact.transcript uses).
export function formatTranscript(turns: TranscriptTurn[] | undefined): string | null {
  const lines = (turns ?? [])
    .filter((t) => str(t.message))
    .map((t) => `${t.role === "agent" ? "AI" : "Caller"}: ${str(t.message)}`);
  return lines.length ? lines.join("\n") : null;
}

// Reads a post_call_transcription event into the provider-neutral shape our
// call pipeline uses. Null for other event types or incomplete payloads.
export function parsePostCall(payload: PostCallPayload, now: Date = new Date()): ParsedPostCall | null {
  if (payload.type !== "post_call_transcription") return null;
  const d = payload.data;
  if (!d?.agent_id || !d.conversation_id) return null;

  const startSecs = d.metadata?.start_time_unix_secs;
  const startedAt = startSecs ? new Date(startSecs * 1000) : now;
  const duration = Math.max(0, d.metadata?.call_duration_secs ?? 0);
  const endedAt = new Date(startedAt.getTime() + duration * 1000);

  const structured: Record<string, string | null> = {};
  for (const [key, result] of Object.entries(d.analysis?.data_collection_results ?? {})) {
    structured[key] = str(result?.value) ?? (typeof result?.value === "number" ? String(result.value) : null);
  }
  // Fall back to ElevenLabs' own summary when the issue field came back empty.
  if (!structured.issue_summary) structured.issue_summary = str(d.analysis?.transcript_summary);

  const callerPhone =
    str(d.metadata?.phone_call?.external_number) ??
    str(d.conversation_initiation_client_data?.dynamic_variables?.system__caller_id);

  return {
    agentId: d.agent_id,
    conversationId: d.conversation_id,
    callerPhone,
    startedAt,
    endedAt,
    transcript: formatTranscript(d.transcript),
    hasAudio: d.has_audio !== false,
    structured,
  };
}
