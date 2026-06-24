import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sendCustomerInvite, revokeCustomerInvite } from "@/lib/services/invitations";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;

  const result = await sendCustomerInvite(id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code ?? null },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();
  const { id } = await params;

  const result = await revokeCustomerInvite(id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code ?? null },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true });
}
