import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createVapiAssistant,
  provisionVapiPhoneNumber,
  linkPhoneNumberToAssistant,
  extractAreaCode,
  type ProvisioningConfig,
} from "@/lib/services/vapi-provisioning";

// Drizzle wraps the driver error, so the real Postgres error (with code +
// constraint) sits on `.cause`. Walk the chain to find it.
function findPgError(
  err: unknown
): { code?: string; constraint?: string; detail?: string } | null {
  let cur = err as { code?: string; constraint?: string; detail?: string; cause?: unknown } | null;
  for (let i = 0; i < 5 && cur; i++) {
    if (typeof cur === "object" && (cur.code || cur.constraint)) {
      return { code: cur.code, constraint: cur.constraint, detail: cur.detail };
    }
    cur = (cur as { cause?: unknown }).cause as typeof cur;
  }
  return null;
}

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
    calendarType,
    calendarId,
    appointmentDurationMinutes,
    appointmentBufferMinutes,
  } = body;

  const resolvedCalendarType = calendarType === "manual" ? "manual" : "google_calendar";
  const durationMinutes = Number(appointmentDurationMinutes) || 120;
  const bufferMinutes = Number.isFinite(Number(appointmentBufferMinutes))
    ? Number(appointmentBufferMinutes)
    : 30;

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
  } catch (err) {
    console.error("[create-customer] step 1 (customer insert) failed:", err);
    const pg = findPgError(err);

    // 23505 = unique_violation. The customers table's only unique column is
    // stripe_customer_id, so surface a clear, actionable message.
    if (pg?.code === "23505") {
      return NextResponse.json(
        {
          error: stripeCustomerId
            ? `A customer with Stripe Customer ID "${stripeCustomerId}" already exists. Leave the field blank or use a unique ID.`
            : "A customer with these details already exists (duplicate unique field).",
          failedStep: 0,
          code: "duplicate",
        },
        { status: 409 }
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to create customer account — ${message}`, failedStep: 0 },
      { status: 500 }
    );
  }

  const config: ProvisioningConfig = {
    businessName,
    ownerName,
    serviceArea: serviceArea ?? "",
    timezone: timezone ?? "America/New_York",
    calendarType: resolvedCalendarType,
    appointmentDurationMinutes: durationMinutes,
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
  } catch (err) {
    console.error("[create-customer] step 2 (Vapi assistant) failed:", err);
    return NextResponse.json(
      {
        error: `Step 2 — AI assistant creation failed. Customer account saved (ID: ${customerId}). ${(err as Error).message}`,
        failedStep: 1,
        customerId,
      },
      { status: 500 }
    );
  }

  // Step 3: Provision phone number
  // Set VAPI_PHONE_PROVISIONING=disabled in dev/free tier to skip this step.
  // Set to "enabled" (or any other value) on paid to provision real numbers.
  const phoneProvisioningEnabled = process.env.VAPI_PHONE_PROVISIONING !== "disabled";

  let vapiPhoneNumberId: string | null = null;
  let provisionedPhone: string | null = null;

  if (phoneProvisioningEnabled) {
    try {
      const result = await provisionVapiPhoneNumber(extractAreaCode(phone));
      vapiPhoneNumberId = result.vapiPhoneNumberId;
      provisionedPhone = result.phoneNumber;
    } catch (err) {
      console.error("[create-customer] step 3 (phone provisioning) failed:", err);
      return NextResponse.json(
        {
          error: `Step 3 — Phone number provisioning failed. Assistant created in Vapi (ID: ${vapiAssistantId}). ${(err as Error).message}`,
          failedStep: 2,
          customerId,
          vapiAssistantId,
        },
        { status: 500 }
      );
    }
  } else {
    console.log("[provision] VAPI_PHONE_PROVISIONING=disabled — skipping phone step");
  }

  // Step 4: Link (if phone provisioned) + create vapi_agents row + activate customer
  try {
    if (vapiPhoneNumberId) {
      await linkPhoneNumberToAssistant(vapiPhoneNumberId, vapiAssistantId);
    }

    await db.insert(vapiAgents).values({
      customerId,
      vapiAssistantId,
      vapiPhoneNumberId,
      phoneNumber: provisionedPhone,
      phoneNumberSource: "vapi_native" as const,
      status: "active",
      servicesOffered: servicesOffered ?? null,
      pricingTable: pricing ?? null,
      businessHours: businessHours ?? null,
      emergencyDefinition,
      ownerName,
      calendarType: resolvedCalendarType,
      calendarId: calendarId || null,
      appointmentDurationMinutes: durationMinutes,
      appointmentBufferMinutes: bufferMinutes,
    });

    await db
      .update(customers)
      .set({ status: "active", onboardedAt: new Date() })
      .where(eq(customers.id, customerId));
  } catch (err) {
    console.error("[create-customer] step 4 (agent activation) failed:", err);
    return NextResponse.json(
      {
        error: `Step 4 — Agent activation failed. Customer ID: ${customerId}, Vapi assistant ID: ${vapiAssistantId}${vapiPhoneNumberId ? `, phone number ID: ${vapiPhoneNumberId}` : ""}. ${(err as Error).message}`,
        failedStep: 3,
        customerId,
        vapiAssistantId,
        vapiPhoneNumberId,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ customerId }, { status: 201 });
}
