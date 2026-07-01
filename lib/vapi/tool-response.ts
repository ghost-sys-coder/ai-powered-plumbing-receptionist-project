// Formats a Vapi function-tool response. Vapi feeds `result` back to the model
// as the tool's output.
export function vapiToolResult(toolCallId: string, result: string): Response {
  return Response.json({ results: [{ toolCallId, result }] });
}

// Safely parse the JSON-string arguments Vapi sends for a tool call.
export function parseToolArgs(raw: unknown): Record<string, string> {
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}
