import { checkVapiSignature } from "@/lib/vapi/verify-signature";
import { vapiToolResult, parseToolArgs } from "@/lib/vapi/tool-response";
import type { ToolHandler, ToolInvocation } from "../tools/types";

type VapiToolPayload = {
  message?: {
    toolCallList?: Array<{ id?: string; function?: { name?: string; arguments?: unknown } }>;
    call?: { id?: string; assistantId?: string; customer?: { number?: string | null } };
  };
};

export type ParsedVapiToolCall = {
  toolCallId: string;
  // Function name as Vapi sent it; echoed back so Vapi can match the result.
  name: string | null;
  invocation: ToolInvocation;
};

// Reads Vapi's tool-call webhook payload into the provider-neutral shape.
// Returns null for unparseable JSON.
export function parseVapiToolCall(rawBody: string): ParsedVapiToolCall | null {
  let payload: VapiToolPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const toolCall = payload.message?.toolCallList?.[0];
  const call = payload.message?.call;
  return {
    toolCallId: toolCall?.id ?? "",
    name: toolCall?.function?.name ?? null,
    invocation: {
      agentId: call?.assistantId ?? null,
      providerCallId: call?.id ?? null,
      callerNumber: call?.customer?.number ?? null,
      args: parseToolArgs(toolCall?.function?.arguments),
    },
  };
}

// The whole Vapi tool endpoint: authenticate, parse, run the shared handler,
// reply in Vapi's format.
export async function handleVapiToolRequest(request: Request, tool: ToolHandler): Promise<Response> {
  const rawBody = await request.text();
  const unauthorized = checkVapiSignature(request, rawBody);
  if (unauthorized) return unauthorized;

  const parsed = parseVapiToolCall(rawBody);
  if (!parsed) return vapiToolResult("", tool.name, tool.invalidRequestMessage);

  const result = await tool.run(parsed.invocation);
  return vapiToolResult(parsed.toolCallId, parsed.name ?? tool.name, result);
}
