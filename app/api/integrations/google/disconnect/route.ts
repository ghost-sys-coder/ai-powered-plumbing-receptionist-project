import { NextRequest, NextResponse } from "next/server";
import { canManageCustomerCalendar, disconnectGoogle } from "@/lib/services/calendar-connections";

// Disconnects a business's Google Calendar; the receptionist goes back to
// taking booking requests as messages.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const customerId = typeof body.customerId === "string" ? body.customerId : "";
  if (!customerId || !(await canManageCustomerCalendar(customerId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await disconnectGoogle(customerId);
  } catch (err) {
    console.error("[calendar] disconnect failed:", (err as Error).message);
    return NextResponse.json({ error: "Couldn't disconnect the calendar. Try again." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
