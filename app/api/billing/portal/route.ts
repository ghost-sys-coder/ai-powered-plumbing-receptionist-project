import { NextRequest, NextResponse } from "next/server";
import { resolveBillingTarget } from "@/lib/billing/target";
import { findAccount } from "@/lib/billing/accounts";
import { createPortalUrl } from "@/lib/billing/checkout";
import { isBillingConfigured } from "@/lib/billing/stripe";

// Opens Stripe's customer portal (card, invoices, cancel) for the account
// the signed-in person may manage.
export async function POST(req: NextRequest) {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing isn't set up on this server yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { customerId?: unknown };
  const result = await resolveBillingTarget(typeof body.customerId === "string" ? body.customerId : null);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const account = await findAccount(result.target.owner);
  if (!account) return NextResponse.json({ error: "There's no subscription yet." }, { status: 404 });

  try {
    // Staff manage from the admin side, so they come back there.
    const returnPath = result.target.onBehalf ? "/admin" : result.target.returnPath;
    return NextResponse.json({ url: await createPortalUrl(account, returnPath) });
  } catch (err) {
    console.error("[billing] portal failed:", err);
    return NextResponse.json({ error: "Couldn't open billing. Try again." }, { status: 502 });
  }
}
