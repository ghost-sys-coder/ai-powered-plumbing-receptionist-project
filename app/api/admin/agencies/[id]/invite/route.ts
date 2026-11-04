import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/staff";
import { inviteAgencyMember } from "@/lib/services/agencies";

// Invites a staff member to an agency (platform admins only). They get an
// email from Clerk; on sign-up the Clerk webhook links them to the agency.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requirePlatformAdmin();
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";

  const result = await inviteAgencyMember(id, email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true });
}
