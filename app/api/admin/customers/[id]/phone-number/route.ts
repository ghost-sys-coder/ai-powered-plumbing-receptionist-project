import { NextResponse } from "next/server";
import { requireStaff, canAccessCustomer, customerNotFound } from "@/lib/auth/staff";
import { addPhoneNumberToCustomer } from "@/lib/services/phone-provisioning";
import { PhoneNumberUnavailableError } from "@/lib/voice/phone-numbers";

// Issues a phone number for a receptionist that doesn't have one yet.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  const { id } = await params;
  if (!(await canAccessCustomer(viewer, id))) return customerNotFound();

  try {
    const result = await addPhoneNumberToCustomer(id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ phoneNumber: result.phoneNumber });
  } catch (err) {
    if (err instanceof PhoneNumberUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error(`[add-phone-number] ${id}:`, err);
    return NextResponse.json({ error: `Couldn't add a number — ${(err as Error).message}` }, { status: 502 });
  }
}
