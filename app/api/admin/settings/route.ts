import { NextRequest, NextResponse } from "next/server";
import { getStaffViewer } from "@/lib/auth/staff";
import { PLATFORM_SETTINGS, setPlatformSetting, type PlatformSettingKey } from "@/lib/services/platform-settings";

// Platform admins change platform-wide switches (body: { key, value }).
export async function PATCH(req: NextRequest) {
  const viewer = await getStaffViewer();
  if (viewer?.kind !== "platform") return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { key?: unknown; value?: unknown };
  if (typeof body.key !== "string" || !(body.key in PLATFORM_SETTINGS)) {
    return NextResponse.json({ error: "Unknown setting" }, { status: 400 });
  }
  const key = body.key as PlatformSettingKey;
  if (typeof body.value !== typeof PLATFORM_SETTINGS[key]) {
    return NextResponse.json({ error: "Wrong value type" }, { status: 400 });
  }

  await setPlatformSetting(key, body.value as never, viewer.clerkId);
  return NextResponse.json({ ok: true });
}
