import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createWebCallToken } from "@/lib/services/web-call";

export async function POST(req: NextRequest) {
  await requireAdmin();

  const { customerId } = await req.json();
  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }

  const result = await createWebCallToken(customerId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ assistantId: result.assistantId });
}
