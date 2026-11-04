import { handleVapiToolRequest } from "@/lib/voice/vapi/tool-route";
import { bookAppointmentTool } from "@/lib/voice/tools/book-appointment";

// Vapi adapter for the shared book-appointment tool (logic in lib/voice/tools/book-appointment.ts).
// The URL is registered on every assistant, so it must not move.
export async function POST(request: Request): Promise<Response> {
  return handleVapiToolRequest(request, bookAppointmentTool);
}
