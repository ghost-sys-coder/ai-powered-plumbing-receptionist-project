import { handleVapiToolRequest } from "@/lib/voice/vapi/tool-route";
import { checkAvailabilityTool } from "@/lib/voice/tools/check-availability";

// Vapi adapter for the shared check-availability tool (logic in lib/voice/tools/check-availability.ts).
// The URL is registered on every assistant, so it must not move.
export async function POST(request: Request): Promise<Response> {
  return handleVapiToolRequest(request, checkAvailabilityTool);
}
