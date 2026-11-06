// Minimal ElevenLabs REST client. We call a handful of endpoints, so plain
// fetch beats pulling in the full SDK.

const BASE_URL = "https://api.elevenlabs.io";
const TIMEOUT_MS = 20_000;

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

export type ElevenLabsApi = {
  <T = unknown>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T>;
  // Raw response, for binary downloads (call audio).
  raw(path: string): Promise<Response>;
};

// Pulls a readable message out of ElevenLabs' error bodies
// ({detail: "..."}, {detail: {message}}, or {detail: [{msg, loc}]}).
export function errorMessage(body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { msg?: string; loc?: unknown[] }) => `${(d.loc ?? []).join(".")}: ${d.msg ?? "invalid"}`)
      .join("; ");
  }
  if (detail && typeof detail === "object" && "message" in detail) return String((detail as { message: unknown }).message);
  return "unknown error";
}

export function elevenLabsApi(apiKey: string): ElevenLabsApi {
  const call = (async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { "xi-api-key": apiKey, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    const parsed = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
    if (!res.ok) {
      throw new ElevenLabsError(`ElevenLabs ${method} ${path.split("?")[0]} failed (${res.status}): ${errorMessage(parsed)}`, res.status);
    }
    return parsed;
  }) as ElevenLabsApi;
  call.raw = (path: string) =>
    fetch(`${BASE_URL}${path}`, { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(60_000) });
  return call;
}
