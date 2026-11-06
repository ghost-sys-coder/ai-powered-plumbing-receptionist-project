import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/drizzle", () => ({ db: {} }));

import { buildAgentPrompt, type PromptConfig } from "@/lib/templates/agent-prompt";
import { CALL_DATA_KEY } from "@/lib/services/calls";
import { getIndustry } from "@/lib/verticals";
import { callDataSchema, vapiAssistantProblems } from "@/lib/services/vapi-provisioning";
import { agentBody, elevenLabsAgentProblems } from "@/lib/voice/elevenlabs/agent-config";

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

const tools = [
  { id: "t1", type: "function", function: { name: "check_availability" } },
  { id: "t2", type: "function", function: { name: "book_appointment" } },
  { id: "t3", type: "function", function: { name: "notify_owner_emergency" } },
  { id: "t4", type: "transferCall" },
];

// An assistant as Vapi returns it after the app pushed `config`.
function vapiAssistant() {
  return {
    firstMessage: "Thank you for calling Hightower Plumbing, how can I help you today?",
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [{ role: "system", content: buildAgentPrompt(config) }],
      toolIds: ["t1", "t2", "t3", "t4"],
    },
    analysisPlan: {
      structuredDataPlan: { enabled: false },
      structuredDataMultiPlan: [
        { key: CALL_DATA_KEY, plan: { enabled: true, schema: callDataSchema(getIndustry("plumbing")) } },
      ],
    },
    startSpeakingPlan: { smartEndpointingPlan: { provider: "livekit" } },
    stopSpeakingPlan: { backoffSeconds: 1.5 },
    voice: { provider: "11labs", voiceId: "someone-else" },
  };
}

describe("vapiAssistantProblems", () => {
  it("finds nothing wrong with an assistant that matches", () => {
    expect(vapiAssistantProblems(vapiAssistant(), config, tools)).toEqual([]);
  });

  it("ignores line-ending differences and settings the app doesn't own", () => {
    const a = vapiAssistant();
    a.model.messages[0].content = a.model.messages[0].content.replace(/\n/g, "\r\n") + "\n";
    a.voice.voiceId = "changed-in-dashboard";
    expect(vapiAssistantProblems(a, config, tools)).toEqual([]);
  });

  it("catches a dashboard save that stripped the call-details capture", () => {
    const a = vapiAssistant() as Record<string, unknown>;
    a.analysisPlan = { structuredDataPlan: { enabled: false } };
    expect(vapiAssistantProblems(a, config, tools)).toEqual(["Call details capture was removed"]);
  });

  it("catches edited instructions, greeting, model and tools", () => {
    const a = vapiAssistant();
    a.model.messages[0].content += "\nAlso offer a discount.";
    a.firstMessage = "Hi!";
    a.model.model = "gpt-4o-mini";
    a.model.toolIds = ["t3"];
    expect(vapiAssistantProblems(a, config, tools)).toEqual([
      "Instructions were changed",
      "Greeting was changed",
      "AI model was changed",
      "Tools were changed",
    ]);
  });

  it("expects no booking or transfer tools when the business doesn't use them", () => {
    const manual: PromptConfig = { ...config, calendarType: "manual", liveTransferEnabled: false };
    const a = vapiAssistant();
    a.model.messages[0].content = buildAgentPrompt(manual);
    expect(vapiAssistantProblems(a, manual, tools)).toEqual(["Tools were changed"]);
    a.model.toolIds = ["t3"];
    expect(vapiAssistantProblems(a, manual, tools)).toEqual([]);
  });
});

describe("elevenLabsAgentProblems", () => {
  const opts = {
    toolIds: { check_availability: "e1", book_appointment: "e2", notify_owner_emergency: "e3" },
    postCallWebhookId: "wh1",
    transfer: { number: "+15125550100", afterHours: false, ownerName: "Ray" },
  };

  it("finds nothing wrong with an agent that matches what we sent", () => {
    const sent = JSON.parse(JSON.stringify(agentBody(config, opts)));
    expect(elevenLabsAgentProblems(sent, agentBody(config, opts))).toEqual([]);
  });

  it("catches removed data collection, webhook and transfer", () => {
    const got = JSON.parse(JSON.stringify(agentBody(config, opts)));
    got.platform_settings = {};
    got.conversation_config.agent.prompt.built_in_tools.transfer_to_number = null;
    expect(elevenLabsAgentProblems(got, agentBody(config, opts))).toEqual([
      "Live transfer was changed",
      "Call details capture was removed",
      "Post-call webhook was removed",
    ]);
  });
});
