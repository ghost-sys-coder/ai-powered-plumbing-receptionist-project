import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/staff";
import { createAgency } from "@/lib/services/agencies";

// Creates an agency (platform admins only).
export async function POST(req: NextRequest) {
  await requirePlatformAdmin();

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Agency name is required" }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: "Agency name must be 120 characters or fewer" }, { status: 400 });
  }

  const agency = await createAgency(name);
  return NextResponse.json({ success: true, id: agency.id });
}
