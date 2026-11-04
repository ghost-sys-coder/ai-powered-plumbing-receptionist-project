import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { getAgency, getHouseAgencyId } from "@/lib/services/agencies";
import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractAreaCode, type ProvisioningConfig } from "@/lib/services/vapi-provisioning";
import { DEFAULT_VOICE_PROVIDER, getProvider, type ReceptionistProvider } from "@/lib/voice";
import { PhoneNumberUnavailableError } from "@/lib/voice/phone-numbers";
import { parseProfileInput } from "@/lib/services/profile-input";
import { getRegion } from "@/lib/regions";

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
  const viewer = await requireStaff();

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

  const profileInput = parseProfileInput(body);
  if (!profileInput.ok) {
    return NextResponse.json({ error: profileInput.error }, { status: 400 });
  }
  const profile = profileInput.value;
  const resolvedTimezone: string = timezone || getRegion(profile.country).defaultTimezone;

  // Owning agency: agency staff always create in their own agency; platform
  // admins pick one (default: the house agency for direct customers).
  let organizationId: string;
  if (viewer.kind === "agency") {
    organizationId = viewer.organizationId;
  } else if (typeof body.organizationId === "string" && body.organizationId) {
    if (!(await getAgency(body.organizationId))) {
      return NextResponse.json({ error: "Agency not found" }, { status: 400 });
    }
    organizationId = body.organizationId;
  } else {
    organizationId = await getHouseAgencyId();
  }

  // Step 1: Create customer row
  let customerId: string;
  try {
    const [customer] = await db
      .insert(customers)
      .values({
        organizationId,
        businessName,
        ownerName,
        email,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        timezone: resolvedTimezone,
        serviceArea: serviceArea || null,
        industry: profile.industry,
        country: profile.country,
        businessDescription: profile.businessDescription,
        // Billing fields are platform-only: agencies are billed per agency, not
        // per client, so values sent by agency staff are ignored.
        stripeCustomerId: viewer.kind === "platform" ? stripeCustomerId || null : null,
        plan: (viewer.kind === "platform" && plan === "pilot" ? "pilot" : "standard") as
          | "pilot"
          | "standard",
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
    timezone: resolvedTimezone,
    calendarType: resolvedCalendarType,
    appointmentDurationMinutes: durationMinutes,
    servicesOffered: servicesOffered ?? [],
    pricing: pricing ?? {},
    emergencyDefinition,
    businessHours: businessHours ?? {},
    ...profile,
  };

  // Step 2: Create the AI assistant on the voice provider, using the owning
  // agency's credentials (the platform's account unless the agency brought
  // its own).
  let provider: ReceptionistProvider;
  let vapiAssistantId: string;
  try {
    provider = await getProvider(DEFAULT_VOICE_PROVIDER, organizationId);
    const result = await provider.createAgent(config);
    vapiAssistantId = result.agentId;
  } catch (err) {
    console.error("[create-customer] step 2 (AI assistant) failed:", err);
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
  let phoneNumberSource: "vapi_native" | "twilio_imported" = "vapi_native";
  // Set when the business's country can't get a number automatically yet;
  // setup still finishes and staff are told why.
  let phoneWarning: string | null = null;

  if (phoneProvisioningEnabled) {
    try {
      const result = await provider.provisionPhoneNumber({
        country: profile.country,
        areaCode: extractAreaCode(phone),
        label: businessName,
      });
      vapiPhoneNumberId = result.phoneNumberId;
      provisionedPhone = result.phoneNumber;
      phoneNumberSource = result.source;
    } catch (err) {
      if (err instanceof PhoneNumberUnavailableError) {
        phoneWarning = err.message;
        console.log(`[create-customer] no automatic number for ${profile.country}: ${err.message}`);
      } else {
        console.error("[create-customer] step 3 (phone provisioning) failed:", err);
        return NextResponse.json(
          {
            error: `Step 3 — Phone number provisioning failed. Assistant created (ID: ${vapiAssistantId}). ${(err as Error).message}`,
            failedStep: 2,
            customerId,
            vapiAssistantId,
          },
          { status: 500 }
        );
      }
    }
  } else {
    console.log("[provision] VAPI_PHONE_PROVISIONING=disabled — skipping phone step");
  }

  // Step 4: Link (if phone provisioned) + create vapi_agents row + activate customer
  try {
    if (vapiPhoneNumberId) {
      await provider.attachPhoneNumber(vapiPhoneNumberId, vapiAssistantId);
    }

    await db.insert(vapiAgents).values({
      customerId,
      provider: provider.id,
      vapiAssistantId,
      vapiPhoneNumberId,
      phoneNumber: provisionedPhone,
      phoneNumberSource,
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

  return NextResponse.json({ customerId, phoneWarning }, { status: 201 });
}
