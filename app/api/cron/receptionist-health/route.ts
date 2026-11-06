import { NextRequest, NextResponse } from "next/server";
import { checkAllReceptionists } from "@/lib/services/receptionist-health";

// Daily: compare every receptionist on its voice platform with the app's
// settings and push them back where they've drifted (see vercel.json and
// lib/services/receptionist-health). Same auth as the billing cron.
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Leave headroom under maxDuration; anything unchecked goes first next run.
  const sweep = await checkAllReceptionists({ budgetMs: 240_000 });
  console.log(
    `[cron] receptionist health: ${sweep.checked} checked, ${sweep.healthy} healthy, ` +
      `${sweep.repaired.length} repaired, ${sweep.broken.length} broken, ${sweep.remaining} left`
  );
  return NextResponse.json(sweep);
}
