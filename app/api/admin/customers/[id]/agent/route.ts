import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/db/drizzle";
import { vapiAgents, customers } from "@/db/schema";
import { updateVapiAssistant, type ProvisioningConfig } from "@/lib/services/vapi-provisioning";

// Updates a customer's agent booking config (calendar type, calendar id,
// appointment duration/buffer) and re-syncs the Vapi assistant prompt + tools.
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

  if (!Number.isFinite(duration) || duration < 30 || duration > 480) {
    return NextResponse.json({ error: "Duration must be 30–480 minutes" }, { status: 400 });
  }
  if (!Number.isFinite(buffer) || buffer < 0 || buffer > 120) {
    return NextResponse.json({ error: "Buffer must be 0–120 minutes" }, { status: 400 });
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

  await db
    .update(vapiAgents)
    .set({
      calendarType,
      calendarId,
      appointmentDurationMinutes: duration,
      appointmentBufferMinutes: buffer,
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

  return NextResponse.json({ success: true });
}
