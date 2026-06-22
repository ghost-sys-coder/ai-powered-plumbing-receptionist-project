import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createVapiAssistant,
  provisionVapiPhoneNumber,
  linkPhoneNumberToAssistant,
  type ProvisioningConfig,
} from "@/lib/services/vapi-provisioning";

export async function POST(req: NextRequest) {
  await requireAdmin();

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

  // Step 1: Create customer row
  let customerId: string;
  try {
    const [customer] = await db
      .insert(customers)
      .values({
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
        status: "onboarding",
      })
      .returning({ id: customers.id });
    customerId = customer.id;
  } catch {
    return NextResponse.json(
      { error: "Failed to create customer account", failedStep: 0 },
      { status: 500 }
    );
  }

  const config: ProvisioningConfig = {
    businessName,
    ownerName,
    serviceArea: serviceArea ?? "",
    servicesOffered: servicesOffered ?? [],
    pricing: pricing ?? {},
    emergencyDefinition,
    businessHours: businessHours ?? {},
  };

  // Step 2: Create Vapi assistant
  let vapiAssistantId: string;
  try {
    const result = await createVapiAssistant(config);
    vapiAssistantId = result.vapiAssistantId;
  } catch {
    return NextResponse.json(
      {
        error: "Failed to create AI assistant. Account saved — retry from customer detail.",
        failedStep: 1,
      },
      { status: 500 }
    );
  }

  // Step 3: Provision phone number
  let vapiPhoneNumberId: string;
  let phoneNumber: string;
  try {
    const result = await provisionVapiPhoneNumber();
    vapiPhoneNumberId = result.vapiPhoneNumberId;
    phoneNumber = result.phoneNumber;
  } catch {
    return NextResponse.json(
      {
        error: "Failed to assign phone number. Assistant created — contact support.",
        failedStep: 2,
      },
      { status: 500 }
    );
  }

  // Step 4: Link + create vapi_agents row + activate customer
  try {
    await linkPhoneNumberToAssistant(vapiPhoneNumberId, vapiAssistantId);

    await db.insert(vapiAgents).values({
      customerId,
      vapiAssistantId,
      vapiPhoneNumberId,
      twilioNumber: phoneNumber,
      status: "active",
      servicesOffered: servicesOffered ?? null,
      pricingTable: pricing ?? null,
      businessHours: businessHours ?? null,
      emergencyDefinition,
      ownerName,
    });

    await db
      .update(customers)
      .set({ status: "active", onboardedAt: new Date() })
      .where(eq(customers.id, customerId));
  } catch {
    return NextResponse.json(
      {
        error: `Failed to activate agent. Contact support with customer ID: ${customerId}`,
        failedStep: 3,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ customerId }, { status: 201 });
}
