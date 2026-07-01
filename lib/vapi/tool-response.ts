// Formats a Vapi function-tool response. Vapi feeds `result` back to the model
// as the tool's output. `name` (the function name) is required — without it Vapi
// can't match the result to the tool call and the model never sees the output.
export function vapiToolResult(
  toolCallId: string,
  name: string,
  result: string
): Response {
  return Response.json({ results: [{ toolCallId, name, result }] });
}

// Parse the arguments Vapi sends for a tool call. Vapi may send them either as
// an already-parsed object OR as a JSON string, so handle both — otherwise every
// argument is silently dropped.
export function parseToolArgs(raw: unknown): Record<string, string> {
  if (raw && typeof raw === "object") return raw as Record<string, string>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  }
  return {};
}
