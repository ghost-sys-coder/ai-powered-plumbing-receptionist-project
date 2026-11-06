import { NextRequest, NextResponse } from "next/server";
import { sweepUnreportedUsage } from "@/lib/billing/usage";

// Daily catch-up for call minutes that didn't reach Stripe (see vercel.json).
//
// Vercel Cron sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is
// set; then nothing else may call this. Without it we accept only Vercel's
// cron user agent. That's spoofable, but the sweep is idempotent and only
// bills minutes that are genuinely owed, so a stray call does no harm.
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await sweepUnreportedUsage();
  console.log(`[cron] billing usage sweep: ${result.checked} call(s) checked`);
  return NextResponse.json(result);
}
