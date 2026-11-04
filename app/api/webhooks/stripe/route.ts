import type Stripe from "stripe";
import { stripe } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/sync";

// Stripe → us: subscription and invoice changes. The signature is checked
// against the raw body; handlers re-read the subscription from Stripe, so
// retries and out-of-order deliveries are safe.
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return new Response("Billing not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error(`[stripe-webhook] ${event.type} ${event.id} failed:`, err);
    return new Response("Handler error", { status: 500 }); // Stripe retries
  }
  return new Response("ok", { status: 200 });
}
