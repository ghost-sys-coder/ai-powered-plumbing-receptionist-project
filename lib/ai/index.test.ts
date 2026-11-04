import { describe, expect, it, vi } from "vitest";
import { AiNotConfiguredError, generateStructured, modelFor, providerOrder } from "./index";

const req = {
  name: "thing",
  description: "a thing",
  system: "sys",
  prompt: "hello",
  schema: { type: "object", properties: { a: { type: "string" } }, required: ["a"], additionalProperties: false },
};

const both = { ANTHROPIC_API_KEY: "ak", OPENAI_API_KEY: "ok" };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const anthropicOk = json(200, { content: [{ type: "tool_use", name: "thing", input: { a: "from-claude" } }] });
const openaiOk = json(200, { choices: [{ message: { content: '{"a":"from-gpt"}' }, finish_reason: "stop" }] });

describe("providerOrder", () => {
  it("prefers Anthropic by default and lists only configured vendors", () => {
    expect(providerOrder(both)).toEqual(["anthropic", "openai"]);
    expect(providerOrder({ OPENAI_API_KEY: "ok" })).toEqual(["openai"]);
    expect(providerOrder({})).toEqual([]);
  });

  it("honours AI_PROVIDER", () => {
    expect(providerOrder({ ...both, AI_PROVIDER: "OpenAI" })).toEqual(["openai", "anthropic"]);
    expect(providerOrder({ ...both, AI_PROVIDER: "nonsense" })).toEqual(["anthropic", "openai"]);
  });

  it("uses model overrides", () => {
    expect(modelFor("openai", { AI_MODEL_OPENAI: "gpt-x" })).toBe("gpt-x");
    expect(modelFor("anthropic", {})).toMatch(/^claude-/);
  });
});

describe("generateStructured", () => {
  it("throws when nothing is configured", async () => {
    await expect(generateStructured(req, { env: {} })).rejects.toBeInstanceOf(AiNotConfiguredError);
  });

  it("reads Anthropic's forced tool call", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(anthropicOk.clone());
    const res = await generateStructured(req, { env: both, fetchImpl });
    expect(res).toMatchObject({ data: { a: "from-claude" }, provider: "anthropic" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const body = JSON.parse(init.body);
    expect(body.tool_choice).toEqual({ type: "tool", name: "thing" });
    expect(body.tools[0].input_schema).toEqual(req.schema);
    expect(init.headers["x-api-key"]).toBe("ak");
  });

  it("uses OpenAI strict JSON schema output", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(openaiOk.clone());
    const res = await generateStructured(req, { env: { ...both, AI_PROVIDER: "openai" }, fetchImpl });
    expect(res).toMatchObject({ data: { a: "from-gpt" }, provider: "openai" });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.response_format.json_schema).toMatchObject({ name: "thing", strict: true, schema: req.schema });
    expect(body.reasoning_effort).toBe("low");
  });

  it("falls back to the next vendor when the first fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(529, { error: { message: "overloaded" } }))
      .mockResolvedValueOnce(openaiOk.clone());
    const res = await generateStructured(req, { env: both, fetchImpl });
    expect(res.provider).toBe("openai");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("reports every failure when all vendors fail", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: { message: "bad key" } }))
      .mockResolvedValueOnce(json(200, { choices: [{ message: { content: "not json" }, finish_reason: "length" }] }));
    await expect(generateStructured(req, { env: both, fetchImpl })).rejects.toThrow(
      /Anthropic 401: bad key.*OpenAI returned invalid JSON/
    );
    warn.mockRestore();
  });
});
