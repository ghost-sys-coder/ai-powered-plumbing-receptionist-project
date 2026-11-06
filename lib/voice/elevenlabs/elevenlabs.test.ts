import { createHmac } from "crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/drizzle", () => ({ db: {} }));

import { NOTIFY_OWNER_TOOL_DEF } from "@/lib/services/vapi-provisioning";
import type { PromptConfig } from "@/lib/templates/agent-prompt";
import { agentBody, dataCollection, toolPath, toolSecret, voiceFor, webhookToolConfig } from "./agent-config";
import { formatTranscript, parsePostCall, verifyElevenLabsSignature } from "./webhook";
import { toolsBaseUrl } from "./provider";

const config: PromptConfig = {
  businessName: "Hightower Plumbing",
  ownerName: "Ray",
  serviceArea: "Greater Austin, TX",
  timezone: "America/Chicago",
  calendarType: "google_calendar",
  appointmentDurationMinutes: 120,
  servicesOffered: [{ name: "Leak repair" }],
  pricing: {},
  emergencyDefinition: "Burst pipe.",
  businessHours: { mon: { open: "08:00", close: "17:00" } },
  liveTransferEnabled: true,
  industry: "plumbing",
  country: "US",
};

describe("ElevenLabs agent config", () => {
  it("builds webhook tools that ElevenLabs fills with the call's ids", () => {
    const tool = webhookToolConfig(NOTIFY_OWNER_TOOL_DEF, { baseUrl: "https://x.test", secret: "s" });
    expect(tool.api_schema.url).toBe("https://x.test/api/elevenlabs/tools/notify-owner-emergency");
    expect(tool.api_schema.request_headers).toEqual({ "X-Receptionist-Secret": "s" });
    const props = tool.api_schema.request_body_schema.properties as Record<string, Record<string, string>>;
    expect(props.conversation_id).toEqual({ type: "string", dynamic_variable: "system__conversation_id" });
    expect(props.agent_id.dynamic_variable).toBe("system__agent_id");
    expect(props.issue_summary.description).toBeTruthy();
    expect(tool.api_schema.request_body_schema.required).toEqual(["issue_summary", "conversation_id", "agent_id"]);
  });

  it("maps tool names to our routes", () => {
    expect(toolPath("check_availability")).toBe("/api/elevenlabs/tools/check-availability");
  });

  it("derives a stable tool secret from the API key", () => {
    expect(toolSecret("k1")).toBe(toolSecret("k1"));
    expect(toolSecret("k1")).not.toBe(toolSecret("k2"));
    expect(toolSecret("k1")).toHaveLength(64);
  });

  it("collects the same call fields as the Vapi plan, plus industry intake", () => {
    const dc = dataCollection(config);
    for (const key of ["caller_name", "issue_summary", "urgency_level", "outcome", "booking_time", "callback_number"]) {
      expect(dc[key]).toMatchObject({ type: "string" });
    }
    expect((dc.outcome as { enum: string[] }).enum).toContain("message_taken");
  });

  it("uses ElevenLabs placeholders and attaches calendar tools, end call and transfer", () => {
    const body = agentBody(config, {
      toolIds: { check_availability: "t1", book_appointment: "t2", notify_owner_emergency: "t3" },
      postCallWebhookId: "wh1",
      transfer: { number: "+15125550100", afterHours: false, ownerName: "Ray" },
    });
    const prompt = body.conversation_config.agent.prompt;
    expect(prompt.prompt).toContain("{{system__time}}");
    expect(prompt.prompt).toContain("{{system__caller_id}}");
    expect(prompt.prompt).toContain("call transfer_to_number");
    expect(prompt.prompt).not.toContain("{{customer.number}}");
    expect(prompt.timezone).toBe("America/Chicago");
    expect(prompt.tool_ids).toEqual(["t1", "t2", "t3"]);
    const transfer = prompt.built_in_tools.transfer_to_number as { params: { transfers: Array<{ transfer_destination: { phone_number: string } }> } };
    expect(transfer.params.transfers[0].transfer_destination.phone_number).toBe("+15125550100");
    expect(body.platform_settings.workspace_overrides?.webhooks.post_call_webhook_id).toBe("wh1");
  });

  it("leaves out calendar tools and transfer when they don't apply", () => {
    const body = agentBody(
      { ...config, calendarType: "manual", liveTransferEnabled: false },
      { toolIds: { check_availability: "t1", book_appointment: "t2", notify_owner_emergency: "t3" }, postCallWebhookId: null, transfer: null }
    );
    expect(body.conversation_config.agent.prompt.tool_ids).toEqual(["t3"]);
    expect(body.conversation_config.agent.prompt.built_in_tools.transfer_to_number).toBeNull();
    expect("workspace_overrides" in body.platform_settings).toBe(false);
  });

  it("picks a voice by country, overridable", () => {
    expect(voiceFor("GB", {})).not.toBe(voiceFor("US", {}));
    expect(voiceFor("UG", {})).toBe(voiceFor("US", {}));
    expect(voiceFor("US", { ELEVENLABS_VOICE_ID: "mine" })).toBe("mine");
  });

  it("points tools at the production app, skipping empty settings", () => {
    expect(toolsBaseUrl({ VAPI_TOOLS_BASE_URL: "", NEXT_PUBLIC_APP_URL: "https://app.test/" })).toBe("https://app.test");
    expect(() => toolsBaseUrl({})).toThrow();
  });
});

describe("ElevenLabs post-call webhook", () => {
  const secret = "whsec_test";
  const sign = (body: string, t: number) =>
    `t=${t},v0=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

  it("verifies signatures and rejects tampering or replays", () => {
    const body = '{"type":"post_call_transcription"}';
    const now = 1_800_000_000;
    expect(verifyElevenLabsSignature(body, sign(body, now), secret, now)).toBe(true);
    expect(verifyElevenLabsSignature(body + " ", sign(body, now), secret, now)).toBe(false);
    expect(verifyElevenLabsSignature(body, sign(body, now - 31 * 60), secret, now)).toBe(false);
    expect(verifyElevenLabsSignature(body, null, secret, now)).toBe(false);
    expect(verifyElevenLabsSignature(body, "garbage", secret, now)).toBe(false);
  });

  it("formats transcripts the way the dashboard reads them", () => {
    expect(
      formatTranscript([
        { role: "agent", message: "Thanks for calling." },
        { role: "user", message: "Hi" },
        { role: "agent", message: null },
      ])
    ).toBe("AI: Thanks for calling.\nCaller: Hi");
    expect(formatTranscript([])).toBeNull();
  });

  it("reads a finished call into our call shape", () => {
    const parsed = parsePostCall({
      type: "post_call_transcription",
      data: {
        agent_id: "agent_1",
        conversation_id: "conv_1",
        has_audio: true,
        transcript: [{ role: "agent", message: "Hello" }],
        metadata: { start_time_unix_secs: 1_800_000_000, call_duration_secs: 95, phone_call: { external_number: "+15125550918" } },
        analysis: {
          transcript_summary: "Caller reported a leak.",
          data_collection_results: {
            caller_name: { value: "Sam" },
            outcome: { value: "message_taken" },
            issue_summary: { value: "" },
          },
        },
      },
    });
    expect(parsed).toMatchObject({
      agentId: "agent_1",
      conversationId: "conv_1",
      callerPhone: "+15125550918",
      hasAudio: true,
      transcript: "AI: Hello",
    });
    expect(parsed!.endedAt.getTime() - parsed!.startedAt.getTime()).toBe(95_000);
    expect(parsed!.structured.caller_name).toBe("Sam");
    expect(parsed!.structured.outcome).toBe("message_taken");
    // Empty issue falls back to ElevenLabs' own summary.
    expect(parsed!.structured.issue_summary).toBe("Caller reported a leak.");
  });

  it("ignores other events and incomplete payloads", () => {
    expect(parsePostCall({ type: "post_call_audio", data: { agent_id: "a", conversation_id: "c" } })).toBeNull();
    expect(parsePostCall({ type: "post_call_transcription", data: {} })).toBeNull();
  });

  it("falls back to the caller id from dynamic variables", () => {
    const parsed = parsePostCall({
      type: "post_call_transcription",
      data: {
        agent_id: "a",
        conversation_id: "c",
        conversation_initiation_client_data: { dynamic_variables: { system__caller_id: "+447700900123" } },
      },
    });
    expect(parsed!.callerPhone).toBe("+447700900123");
  });
});
