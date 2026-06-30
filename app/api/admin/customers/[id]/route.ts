import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/db/drizzle";
import { customers, vapiAgents, calls, bookings, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
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
          timezone: timezone ?? "America/New_York",
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;

  const [customer] = await db
    .select({ id: customers.id, businessName: customers.businessName })
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // 1. Delete linked Clerk users, then DB user rows
  const linkedUsers = await db
    .select({ clerkId: users.clerkId })
    .from(users)
    .where(eq(users.customerId, id));

  if (linkedUsers.length > 0) {
    const clerk = await clerkClient();
    for (const { clerkId } of linkedUsers) {
      try {
        await clerk.users.deleteUser(clerkId);
      } catch (err) {
        console.warn(`[delete-customer] Clerk delete failed for ${clerkId}:`, (err as Error).message);
      }
    }
    await db.delete(users).where(eq(users.customerId, id));
  }

  // 2. Delete bookings before calls (FK: bookings.call_id → calls.id)
  const customerCalls = await db
    .select({ id: calls.id })
    .from(calls)
    .where(eq(calls.customerId, id));

  if (customerCalls.length > 0) {
    const callIds = customerCalls.map((c) => c.id);
    await db.delete(bookings).where(inArray(bookings.callId, callIds));
  }

  // 3. calls → vapiAgents → customer (pending_invites cascade automatically)
  await db.delete(calls).where(eq(calls.customerId, id));
  await db.delete(vapiAgents).where(eq(vapiAgents.customerId, id));
  await db.delete(customers).where(eq(customers.id, id));

  console.log(`[delete-customer] deleted customer ${id} (${customer.businessName})`);
  return NextResponse.json({ success: true });
}
