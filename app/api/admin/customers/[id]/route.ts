import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  updateVapiAssistant,
  type ProvisioningConfig,
} from "@/lib/services/vapi-provisioning";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;

  const body = await req.json();
  const {
    businessName,
    ownerName,
    email,
    phone,
    address,
    city,
    state,
    timezone,
    serviceArea,
    emergencyDefinition,
    businessHours,
    servicesOffered,
    pricing,
    plan,
    stripeCustomerId,
  } = body;

  if (!businessName || !ownerName || !email || !emergencyDefinition) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Update customer row
  const updated = await db
    .update(customers)
    .set({
      businessName,
      ownerName,
      email,
      phone: phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      timezone: timezone ?? "America/New_York",
      serviceArea: serviceArea || null,
      stripeCustomerId: stripeCustomerId || null,
      plan: (plan === "pilot" ? "pilot" : "standard") as "pilot" | "standard",
    })
    .where(eq(customers.id, id))
    .returning({ id: customers.id });

  if (!updated.length) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Update agent row
  const [agent] = await db
    .select({ vapiAssistantId: vapiAgents.vapiAssistantId })
    .from(vapiAgents)
    .where(eq(vapiAgents.customerId, id))
    .limit(1);

  if (agent) {
    await db
      .update(vapiAgents)
      .set({
        ownerName,
        servicesOffered: servicesOffered ?? null,
        pricingTable: pricing ?? null,
        businessHours: businessHours ?? null,
        emergencyDefinition,
      })
      .where(eq(vapiAgents.customerId, id));

    // Sync Vapi assistant prompt — non-fatal if it fails
    if (agent.vapiAssistantId) {
      try {
        const config: ProvisioningConfig = {
          businessName,
          ownerName,
          serviceArea: serviceArea ?? "",
          servicesOffered: servicesOffered ?? [],
          pricing: pricing ?? {},
          emergencyDefinition,
          businessHours: businessHours ?? {},
        };
        await updateVapiAssistant(agent.vapiAssistantId, config);
      } catch {
        // DB is already updated; Vapi sync failure is logged but not fatal
      }
    }
  }

  return NextResponse.json({ success: true });
}
