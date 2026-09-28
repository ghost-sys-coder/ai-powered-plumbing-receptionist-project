import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/db/drizzle";
import { vapiAgents, customers } from "@/db/schema";
import { updateVapiAssistant, type ProvisioningConfig } from "@/lib/services/vapi-provisioning";
import { checkCalendarAccess } from "@/lib/services/calendar-availability";

// Updates a customer's agent booking config (calendar type, calendar id,
// appointment duration/buffer, standard/emergency booking notice) and re-syncs
// the Vapi assistant prompt + tools.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;

  const body = await req.json();
  const calendarType = body.calendarType === "manual" ? "manual" : "google_calendar";
  const calendarId: string | null = body.calendarId?.trim() || null;
  const duration = Number(body.appointmentDurationMinutes);
  const buffer = Number(body.appointmentBufferMinutes);
  const minLead = Number(body.minLeadMinutes);
  const emergencyLead = Number(body.emergencyLeadMinutes);
  // Optional. Stored in E.164 (what Twilio requires); blank disables alerts.
  const alertPhone: string | null =
    typeof body.alertPhone === "string" && body.alertPhone.trim()
      ? body.alertPhone.replace(/[\s()-]/g, "")
      : null;

  if (!Number.isFinite(duration) || duration < 30 || duration > 480) {
    return NextResponse.json({ error: "Duration must be 30–480 minutes" }, { status: 400 });
  }
  if (!Number.isFinite(buffer) || buffer < 0 || buffer > 120) {
    return NextResponse.json({ error: "Buffer must be 0–120 minutes" }, { status: 400 });
  }
  if (!Number.isFinite(minLead) || minLead < 15 || minLead > 1440) {
    return NextResponse.json(
      { error: "Minimum booking notice must be 15–1440 minutes" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(emergencyLead) || emergencyLead < 15 || emergencyLead > minLead) {
    return NextResponse.json(
      { error: "Emergency notice must be at least 15 minutes and no more than the standard notice" },
      { status: 400 }
    );
  }
  if (alertPhone && !/^\+[1-9]\d{7,14}$/.test(alertPhone)) {
    return NextResponse.json(
      { error: "Alert phone must be in international format, e.g. +15125550123" },
      { status: 400 }
    );
  }
  if (alertPhone && alertPhone === process.env.TWILIO_FROM_NUMBER) {
    return NextResponse.json(
      { error: "Alert phone can't be the number alerts are sent from — use the owner's mobile" },
      { status: 400 }
    );
  }
  if (calendarType === "google_calendar" && !calendarId) {
    return NextResponse.json(
      { error: "A calendar ID is required for Google Calendar booking" },
      { status: 400 }
    );
  }

  const [row] = await db
    .select({
      vapiAssistantId: vapiAgents.vapiAssistantId,
      ownerName: vapiAgents.ownerName,
      servicesOffered: vapiAgents.servicesOffered,
      pricingTable: vapiAgents.pricingTable,
      businessHours: vapiAgents.businessHours,
      emergencyDefinition: vapiAgents.emergencyDefinition,
      businessName: customers.businessName,
      ownerNameCustomer: customers.ownerName,
      serviceArea: customers.serviceArea,
      timezone: customers.timezone,
    })
    .from(vapiAgents)
    .innerJoin(customers, eq(vapiAgents.customerId, customers.id))
    .where(eq(vapiAgents.customerId, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Verify the calendar before saving: an unshared or mistyped ID would make
  // every booking fail mid-call, and a timezone mismatch makes the calendar
  // read hours off from what the AI tells callers.
  const warnings: string[] = [];
  if (calendarType === "google_calendar" && calendarId) {
    const check = await checkCalendarAccess(calendarId);
    if (!check.ok && !check.unreachable) {
      return NextResponse.json({ error: check.message }, { status: 400 });
    }
    if (!check.ok) {
      warnings.push(check.message);
    } else if (check.timeZone && check.timeZone !== row.timezone) {
      warnings.push(
        `The calendar's timezone is ${check.timeZone} but the business is ${row.timezone}. ` +
          `Bookings are still correct, but the calendar will show them in ${check.timeZone} time — ` +
          `change the calendar's timezone in Google Calendar settings to match.`
      );
    }
  }

  await db
    .update(vapiAgents)
    .set({
      calendarType,
      calendarId,
      appointmentDurationMinutes: duration,
      appointmentBufferMinutes: buffer,
      minLeadMinutes: minLead,
      emergencyLeadMinutes: emergencyLead,
      alertPhone,
    })
    .where(eq(vapiAgents.customerId, id));

  // Re-sync the assistant prompt + tools via the SDK (correct model.messages shape).
  try {
    const config: ProvisioningConfig = {
      businessName: row.businessName,
      ownerName: row.ownerName ?? row.ownerNameCustomer,
      serviceArea: row.serviceArea ?? "",
      timezone: row.timezone ?? "America/New_York",
      calendarType,
      appointmentDurationMinutes: duration,
      servicesOffered: (row.servicesOffered as ProvisioningConfig["servicesOffered"]) ?? [],
      pricing: (row.pricingTable as ProvisioningConfig["pricing"]) ?? {},
      emergencyDefinition: row.emergencyDefinition ?? "",
      businessHours: (row.businessHours as ProvisioningConfig["businessHours"]) ?? {},
    };
    await updateVapiAssistant(row.vapiAssistantId, config);
  } catch (err) {
    console.error("[agent-config] Vapi sync failed:", err);
    return NextResponse.json(
      {
        error: `Config saved, but syncing the assistant failed: ${(err as Error).message}`,
        code: "sync_failed",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, warnings });
}
