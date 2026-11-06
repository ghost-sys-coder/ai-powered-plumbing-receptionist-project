import { NextRequest, NextResponse } from "next/server";
import { requireStaff, canAccessCustomer, customerNotFound } from "@/lib/auth/staff";
import { createWebCallToken } from "@/lib/services/web-call";

export async function POST(req: NextRequest) {
  const viewer = await requireStaff();

  const { customerId } = await req.json();
  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }
  if (!(await canAccessCustomer(viewer, customerId))) return customerNotFound();

  const result = await createWebCallToken(customerId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    result.provider === "elevenlabs"
      ? { provider: result.provider, signedUrl: result.signedUrl }
      : { provider: result.provider, assistantId: result.assistantId }
  );
}
