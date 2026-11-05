import { NextRequest, NextResponse } from "next/server";
import { resolveBillingTarget } from "@/lib/billing/target";
import { BillingStateError, createCheckoutUrl } from "@/lib/billing/checkout";
import { DEFAULT_PLAN, PLANS, isBillingCurrency, isPlanId } from "@/lib/billing/plans";
import { isBillingConfigured } from "@/lib/billing/stripe";

// Starts a subscription: returns a Stripe Checkout URL. The signed-in person
// is sent there; staff acting for a customer get the link to pass on.
export async function POST(req: NextRequest) {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing isn't set up on this server yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { customerId?: unknown; currency?: unknown; plan?: unknown };
  const result = await resolveBillingTarget(typeof body.customerId === "string" ? body.customerId : null);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const { target } = result;

  // Agencies choose their billing currency; direct customers pay in their
  // country's currency.
  const currency =
    target.owner.kind === "agency" && isBillingCurrency(body.currency) ? body.currency : target.currency;

  if (body.plan !== undefined && !(isPlanId(body.plan) && PLANS[body.plan].kind === target.owner.kind)) {
    return NextResponse.json({ error: "Choose one of the plans shown." }, { status: 400 });
  }
  const plan = isPlanId(body.plan) ? body.plan : DEFAULT_PLAN[target.owner.kind];

  try {
    const url = await createCheckoutUrl({
      owner: target.owner,
      plan,
      email: target.email,
      currency,
      returnPath: target.returnPath,
    });
    return NextResponse.json({ url, onBehalf: target.onBehalf });
  } catch (err) {
    if (err instanceof BillingStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[billing] checkout failed:", err);
    return NextResponse.json({ error: "Couldn't start checkout. Try again." }, { status: 502 });
  }
}
