import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { assignCustomerRole } from "@/lib/services/invitations";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;

  const result = await assignCustomerRole(id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code ?? null },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true });
}
