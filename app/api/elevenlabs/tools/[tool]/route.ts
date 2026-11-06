import { timingSafeEqual } from "crypto";
import { checkAvailabilityTool } from "@/lib/voice/tools/check-availability";
import { bookAppointmentTool } from "@/lib/voice/tools/book-appointment";
import { notifyOwnerTool } from "@/lib/voice/tools/notify-owner";
import type { ToolHandler } from "@/lib/voice/tools/types";
import { TOOL_SECRET_HEADER, toolSecret } from "@/lib/voice/elevenlabs/agent-config";

// ElevenLabs adapter for the shared mid-call tools (logic in lib/voice/tools).
// URLs are registered on the workspace tools by lib/voice/elevenlabs/provider.ts.
const TOOLS: Record<string, ToolHandler> = {
  "check-availability": checkAvailabilityTool,
  "book-appointment": bookAppointmentTool,
  "notify-owner-emergency": notifyOwnerTool,
};

// The model only sees strings; booleans and numbers arrive as JSON values.
const asString = (v: unknown): string | null =>
  v === null || v === undefined || v === "" ? null : typeof v === "string" ? v : String(v);

function authorized(request: Request): boolean {
  const key = process.env.ELEVENLABS_API_KEY;
  const sent = request.headers.get(TOOL_SECRET_HEADER);
  if (!key || !sent) return false;
  const expected = Buffer.from(toolSecret(key));
  const got = Buffer.from(sent);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export async function POST(request: Request, { params }: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await params;
  const tool = TOOLS[slug];
  if (!tool) return Response.json({ error: "Unknown tool" }, { status: 404 });
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ result: tool.invalidRequestMessage });
  }

  const { conversation_id, agent_id, caller_id, ...rest } = body;
  const args: Record<string, string> = {};
  for (const [k, v] of Object.entries(rest)) {
    const s = asString(v);
    if (s !== null) args[k] = s;
  }

  const result = await tool.run({
    agentId: asString(agent_id),
    providerCallId: asString(conversation_id),
    callerNumber: asString(caller_id),
    args,
  });
  return Response.json({ result });
}
