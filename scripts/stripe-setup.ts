/**
 * Creates (or finds) everything billing needs in Stripe: the minutes meter,
 * one product per plan (lib/billing/plans.ts), monthly + per-minute prices in every currency, and a
 * customer-portal configuration. Idempotent: safe to re-run; existing objects
 * are matched by id / lookup key / metadata and left alone.
 *
 * Runs against whichever account STRIPE_SECRET_KEY belongs to (test or live).
 *
 * Usage:
 *   npx tsx scripts/stripe-setup.ts           # dry run (prints plan)
 *   npx tsx scripts/stripe-setup.ts --apply   # creates what's missing
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

import Stripe from "stripe";
import {
  BILLING_CURRENCIES,
  METER_EVENT_NAME,
  PLAN_IDS,
  PLANS,
  STRIPE_APP_TAG,
  lookupKey,
  productId,
} from "../lib/billing/plans";

const apply = process.argv.includes("--apply");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const tag = { app: STRIPE_APP_TAG };

async function run() {
  const account = await stripe.accounts.retrieveCurrent();
  const mode = process.env.STRIPE_SECRET_KEY!.includes("_live_") ? "LIVE" : "test";
  console.log(`Stripe account ${account.id} (${account.settings?.dashboard?.display_name ?? "?"}), ${mode} mode`);
  console.log(apply ? "Applying…\n" : "Dry run (pass --apply to create)\n");

  // 1. Meter
  const meters = await stripe.billing.meters.list({ status: "active", limit: 100 });
  let meter = meters.data.find((m) => m.event_name === METER_EVENT_NAME);
  if (meter) {
    console.log(`meter      ${meter.id} exists`);
  } else if (apply) {
    meter = await stripe.billing.meters.create({
      display_name: "Receptionist minutes",
      event_name: METER_EVENT_NAME,
      default_aggregation: { formula: "sum" },
      customer_mapping: { type: "by_id", event_payload_key: "stripe_customer_id" },
      value_settings: { event_payload_key: "value" },
    });
    console.log(`meter      ${meter.id} created`);
  } else {
    console.log(`meter      ${METER_EVENT_NAME} would be created`);
  }

  // 2. Products
  for (const plan of PLAN_IDS) {
    const cfg = PLANS[plan];
    const id = productId(plan);
    const productName = `${cfg.kind === "agency" ? "Agency" : "AI Receptionist"} ${cfg.name}`;
    const meta = { ...tag, plan, kind: cfg.kind };
    let product = await stripe.products.retrieve(id).catch(() => null);
    if (product) {
      console.log(`product    ${id} exists`);
    } else if (apply) {
      product = await stripe.products.create({
        id,
        name: productName,
        description: cfg.description,
        metadata: meta,
      });
      console.log(`product    ${id} created`);
    } else {
      console.log(`product    ${id} would be created`);
    }

    // 3. Prices
    const keys = BILLING_CURRENCIES.flatMap((c) => [lookupKey(plan, "monthly", c), lookupKey(plan, "minutes", c)]);
    const existing = await stripe.prices.list({ lookup_keys: keys, limit: 100 });
    const have = new Set(existing.data.map((p) => p.lookup_key));

    for (const currency of BILLING_CURRENCIES) {
      const monthlyKey = lookupKey(plan, "monthly", currency);
      if (have.has(monthlyKey)) {
        console.log(`price      ${monthlyKey} exists`);
      } else if (apply) {
        await stripe.prices.create({
          product: id,
          currency,
          unit_amount: cfg.monthly[currency],
          recurring: { interval: "month", usage_type: "licensed" },
          lookup_key: monthlyKey,
          nickname: `${productName} monthly (${currency.toUpperCase()})`,
          metadata: { ...meta, part: "monthly" },
        });
        console.log(`price      ${monthlyKey} created`);
      } else {
        console.log(`price      ${monthlyKey} would be created`);
      }

      const minutesKey = lookupKey(plan, "minutes", currency);
      if (have.has(minutesKey)) {
        console.log(`price      ${minutesKey} exists`);
      } else if (apply) {
        if (!meter) throw new Error("meter missing");
        const common = {
          product: id,
          currency,
          lookup_key: minutesKey,
          nickname: `${productName} minutes (${currency.toUpperCase()})`,
          metadata: { ...meta, part: "minutes" },
          recurring: { interval: "month" as const, usage_type: "metered" as const, meter: meter.id },
        };
        if (cfg.includedMinutes > 0) {
          await stripe.prices.create({
            ...common,
            billing_scheme: "tiered",
            tiers_mode: "graduated",
            tiers: [
              { up_to: cfg.includedMinutes, unit_amount: 0 },
              { up_to: "inf", unit_amount: cfg.perMinute[currency] },
            ],
          });
        } else {
          await stripe.prices.create({ ...common, unit_amount: cfg.perMinute[currency] });
        }
        console.log(`price      ${minutesKey} created`);
      } else {
        console.log(`price      ${minutesKey} would be created`);
      }
    }
  }

  // 4. Customer portal
  const portals = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const portal = portals.data.find((c) => c.metadata?.app === STRIPE_APP_TAG);
  if (portal) {
    console.log(`portal     ${portal.id} exists`);
  } else if (apply) {
    const created = await stripe.billingPortal.configurations.create({
      name: "AI receptionist",
      metadata: tag,
      business_profile: { headline: "Manage your AI receptionist subscription" },
      features: {
        customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id", "name"] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    });
    console.log(`portal     ${created.id} created`);
  } else {
    console.log("portal     would be created");
  }
}

run().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
