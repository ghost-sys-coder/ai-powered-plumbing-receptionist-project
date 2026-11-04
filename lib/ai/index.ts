// Provider-neutral access to large language models. Every feature asks for
// structured output through generateStructured(); which vendor answers is a
// configuration choice, and if the preferred one fails the next configured
// one is tried, so an outage at one vendor doesn't take features down.
//
// Configuration (all optional except at least one key):
//   ANTHROPIC_API_KEY, OPENAI_API_KEY   — a vendor is available when its key is set
//   AI_PROVIDER=anthropic|openai        — preferred vendor (default: anthropic)
//   AI_MODEL_ANTHROPIC, AI_MODEL_OPENAI — override the default model per vendor
//
// Plain fetch, no SDKs: adding a vendor means adding one adapter below.

export const AI_PROVIDER_IDS = ["anthropic", "openai"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

type Env = Record<string, string | undefined>;

// A JSON Schema for an object. Written to satisfy OpenAI's strict mode (every
// property listed in `required`, `additionalProperties: false`, optional
// values typed as nullable), which Anthropic's tool schemas also accept.
export type JsonSchema = Record<string, unknown>;

export type StructuredRequest = {
  // Short snake_case name for the output, e.g. "business_profile".
  name: string;
  description: string;
  system: string;
  prompt: string;
  schema: JsonSchema;
  maxTokens?: number;
};

export type StructuredResult<T> = { data: T; provider: AiProviderId; model: string };

export class AiNotConfiguredError extends Error {
  constructor() {
    super("No AI provider is configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)");
    this.name = "AiNotConfiguredError";
  }
}

const DEFAULT_MODELS: Record<AiProviderId, string> = {
  anthropic: "claude-haiku-5-5",
  openai: "gpt-5.4-mini",
};

const TIMEOUT_MS = 45_000;

function apiKey(provider: AiProviderId, env: Env): string | undefined {
  return provider === "anthropic" ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
}

export function modelFor(provider: AiProviderId, env: Env = process.env): string {
  const override = provider === "anthropic" ? env.AI_MODEL_ANTHROPIC : env.AI_MODEL_OPENAI;
  return override?.trim() || DEFAULT_MODELS[provider];
}

// Configured vendors, preferred first.
export function providerOrder(env: Env = process.env): AiProviderId[] {
  const preferred = AI_PROVIDER_IDS.find((p) => p === env.AI_PROVIDER?.trim().toLowerCase()) ?? "anthropic";
  return [preferred, ...AI_PROVIDER_IDS.filter((p) => p !== preferred)].filter((p) => !!apiKey(p, env));
}

export function isAiConfigured(env: Env = process.env): boolean {
  return providerOrder(env).length > 0;
}

type Adapter = (req: StructuredRequest, key: string, model: string, fetchImpl: typeof fetch) => Promise<unknown>;

async function postJson(
  fetchImpl: typeof fetch,
  label: string,
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<Record<string, unknown>> {
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = data.error as { message?: string } | undefined;
    throw new Error(`${label} ${res.status}: ${err?.message ?? "request failed"}`);
  }
  return data;
}

// Anthropic: force a single tool call whose input is the structured output.
const anthropic: Adapter = async (req, key, model, fetchImpl) => {
  const data = await postJson(
    fetchImpl,
    "Anthropic",
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": key, "anthropic-version": "2023-06-01" },
    {
      model,
      max_tokens: req.maxTokens ?? 4096,
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
      tools: [{ name: req.name, description: req.description, input_schema: req.schema }],
      tool_choice: { type: "tool", name: req.name },
    }
  );
  const blocks = (data.content as Array<{ type: string; name?: string; input?: unknown }>) ?? [];
  const call = blocks.find((b) => b.type === "tool_use" && b.name === req.name);
  if (!call?.input) throw new Error(`Anthropic returned no ${req.name} (stop: ${String(data.stop_reason)})`);
  return call.input;
};

// OpenAI: Chat Completions with a strict JSON schema response format.
const openai: Adapter = async (req, key, model, fetchImpl) => {
  // Reasoning models spend part of the budget thinking; keep it short.
  const reasoning = /^(gpt-5|o\d)/.test(model) ? { reasoning_effort: "low" } : {};
  const data = await postJson(
    fetchImpl,
    "OpenAI",
    "https://api.openai.com/v1/chat/completions",
    { Authorization: `Bearer ${key}` },
    {
      model,
      max_completion_tokens: (req.maxTokens ?? 4096) * 2,
      ...reasoning,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: req.name, description: req.description, strict: true, schema: req.schema },
      },
    }
  );
  const choice = (data.choices as Array<{ message?: { content?: string; refusal?: string }; finish_reason?: string }>)?.[0];
  if (choice?.message?.refusal) throw new Error(`OpenAI declined: ${choice.message.refusal}`);
  const content = choice?.message?.content;
  if (!content) throw new Error(`OpenAI returned no ${req.name} (finish: ${String(choice?.finish_reason)})`);
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`OpenAI returned invalid JSON (finish: ${String(choice?.finish_reason)})`);
  }
};

const ADAPTERS: Record<AiProviderId, Adapter> = { anthropic, openai };

// The returned data matches the schema's shape but comes from a model: callers
// must still validate values before trusting them.
export async function generateStructured<T = unknown>(
  req: StructuredRequest,
  opts: { env?: Env; fetchImpl?: typeof fetch } = {}
): Promise<StructuredResult<T>> {
  const env = opts.env ?? process.env;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const order = providerOrder(env);
  if (order.length === 0) throw new AiNotConfiguredError();

  const failures: string[] = [];
  for (const provider of order) {
    const model = modelFor(provider, env);
    try {
      const data = await ADAPTERS[provider](req, apiKey(provider, env)!, model, fetchImpl);
      return { data: data as T, provider, model };
    } catch (err) {
      const message = (err as Error).message;
      failures.push(message);
      console.warn(`[ai] ${provider}/${model} failed for ${req.name}: ${message}`);
    }
  }
  throw new Error(`Every AI provider failed — ${failures.join("; ")}`);
}
