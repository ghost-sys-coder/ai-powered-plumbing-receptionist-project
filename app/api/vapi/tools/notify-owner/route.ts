import { handleVapiToolRequest } from "@/lib/voice/vapi/tool-route";
import { notifyOwnerTool } from "@/lib/voice/tools/notify-owner";

// Vapi adapter for the shared notify-owner tool (logic in lib/voice/tools/notify-owner.ts).
// The URL is registered on every assistant, so it must not move.
export async function POST(request: Request): Promise<Response> {
  return handleVapiToolRequest(request, notifyOwnerTool);
}
