import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleVapiToolRequest, parseVapiToolCall } from "./tool-route";
import type { ToolHandler } from "../tools/types";

const SECRET = "test-secret";

function vapiBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    message: {
      toolCallList: [
        { id: "tc_1", function: { name: "check_availability", arguments: '{"preferred_date":"Friday"}' } },
      ],
      call: { id: "call_1", assistantId: "asst_1", customer: { number: "+15551234567" } },
      ...overrides,
    },
  });
}

function request(body: string, secret: string | null = SECRET) {
  return new Request("https://example.test/api/vapi/tools/x", {
    method: "POST",
    headers: secret ? { "x-vapi-secret": secret } : {},
    body,
  });
}

describe("parseVapiToolCall", () => {
  it("normalises the Vapi payload, parsing stringified arguments", () => {
    expect(parseVapiToolCall(vapiBody())).toEqual({
      toolCallId: "tc_1",
      name: "check_availability",
      invocation: {
        agentId: "asst_1",
        providerCallId: "call_1",
        callerNumber: "+15551234567",
        args: { preferred_date: "Friday" },
      },
    });
  });

  it("accepts already-parsed arguments and missing fields", () => {
    const parsed = parseVapiToolCall(
      JSON.stringify({ message: { toolCallList: [{ function: { arguments: { urgent: "true" } } }] } })
    );
    expect(parsed?.invocation).toEqual({
      agentId: null,
      providerCallId: null,
      callerNumber: null,
      args: { urgent: "true" },
    });
    expect(parsed?.toolCallId).toBe("");
  });

  it("returns null for invalid JSON", () => {
    expect(parseVapiToolCall("{not json")).toBeNull();
  });
});

describe("handleVapiToolRequest", () => {
  const run = vi.fn(async () => "result text");
  const tool: ToolHandler = { name: "check_availability", invalidRequestMessage: "bad request", run };

  beforeEach(() => {
    vi.stubEnv("VAPI_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("SKIP_VAPI_SIGNATURE_VERIFY", "false");
    run.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("runs the shared handler and replies in Vapi's format", async () => {
    const res = await handleVapiToolRequest(request(vapiBody()), tool);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      results: [{ toolCallId: "tc_1", name: "check_availability", result: "result text" }],
    });
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: "asst_1", providerCallId: "call_1" })
    );
  });

  it("rejects requests without the shared secret before running anything", async () => {
    const res = await handleVapiToolRequest(request(vapiBody(), "wrong"), tool);
    expect(res.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("answers unparseable bodies with the tool's safe message", async () => {
    const res = await handleVapiToolRequest(request("{oops"), tool);
    expect(await res.json()).toEqual({
      results: [{ toolCallId: "", name: "check_availability", result: "bad request" }],
    });
    expect(run).not.toHaveBeenCalled();
  });
});
