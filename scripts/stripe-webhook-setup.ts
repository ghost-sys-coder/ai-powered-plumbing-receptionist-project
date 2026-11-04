/**
 * Creates the Stripe webhook endpoint for this app (if missing) and writes its
 * signing secret to .env.local as STRIPE_WEBHOOK_SECRET. The secret is only
 * returned by Stripe at creation, so an existing endpoint is left alone.
 *
 * Usage: npx tsx scripts/stripe-webhook-setup.ts https://your-domain
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { readFileSync, writeFileSync } from "fs";
import Stripe from "stripe";
import { STRIPE_APP_TAG } from "../lib/billing/plans";

const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
];

async function run() {
  const origin = process.argv[2]?.replace(/\/$/, "");
  if (!origin?.startsWith("https://")) throw new Error("Pass the site's https origin");
  const url = `${origin}/api/webhooks/stripe`;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((w) => w.url === url);
  if (existing) {
    console.log(`endpoint ${existing.id} already exists for ${url} (status ${existing.status})`);
    return;
  }
  const created = await stripe.webhookEndpoints.create({
    url,
    enabled_events: EVENTS,
    description: "AI receptionist billing",
    metadata: { app: STRIPE_APP_TAG },
  });
  const file = ".env.local";
  const lines = readFileSync(file, "utf8").split(/\r?\n/).filter((l) => !l.startsWith("STRIPE_WEBHOOK_SECRET="));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  lines.push(`STRIPE_WEBHOOK_SECRET=${created.secret}`, "");
  writeFileSync(file, lines.join("\n"));
  console.log(`endpoint ${created.id} created for ${url}; signing secret saved to ${file}`);
}

run().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
