import { NextRequest, NextResponse } from "next/server";
import { resolveBillingTarget } from "@/lib/billing/target";
import { findAccount } from "@/lib/billing/accounts";
import { BillingStateError, changePlan } from "@/lib/billing/checkout";
import { PLANS, isPlanId } from "@/lib/billing/plans";
import { isBillingConfigured } from "@/lib/billing/stripe";

// Switches a live subscription to another plan. Same access rules as checkout.
export async function POST(req: NextRequest) {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing isn't set up on this server yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { customerId?: unknown; plan?: unknown };
  const result = await resolveBillingTarget(typeof body.customerId === "string" ? body.customerId : null);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const { owner } = result.target;

  if (!isPlanId(body.plan) || PLANS[body.plan].kind !== owner.kind) {
    return NextResponse.json({ error: "Choose one of the plans shown." }, { status: 400 });
  }
  const account = await findAccount(owner);
  if (!account) return NextResponse.json({ error: "There's no subscription yet." }, { status: 409 });

  try {
    await changePlan(account, body.plan);
    return NextResponse.json({ ok: true, plan: body.plan });
  } catch (err) {
    if (err instanceof BillingStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[billing] plan change failed:", err);
    return NextResponse.json({ error: "Couldn't change the plan. Try again." }, { status: 502 });
  }
}
