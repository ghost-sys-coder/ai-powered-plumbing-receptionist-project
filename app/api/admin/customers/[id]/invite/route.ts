import { NextRequest, NextResponse } from "next/server";
import { requireStaff, canAccessCustomer, customerNotFound } from "@/lib/auth/staff";
import { sendCustomerInvite, revokeCustomerInvite } from "@/lib/services/invitations";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewer = await requireStaff();
  const { id } = await params;
  if (!(await canAccessCustomer(viewer, id))) return customerNotFound();

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
  const viewer = await requireStaff();
  const { id } = await params;
  if (!(await canAccessCustomer(viewer, id))) return customerNotFound();

  const result = await revokeCustomerInvite(id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code ?? null },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true });
}
