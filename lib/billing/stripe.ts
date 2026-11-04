import Stripe from "stripe";
import { STRIPE_APP_TAG } from "./plans";

let client: Stripe | null = null;

export function isBillingConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return !!env.STRIPE_SECRET_KEY;
}

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Billing is not configured (STRIPE_SECRET_KEY)");
    client = new Stripe(key, { appInfo: { name: STRIPE_APP_TAG } });
  }
  return client;
}

// The site's public origin, for Checkout/portal return links.
export function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

let portalConfigId: string | null = null;

// The customer-portal configuration made by scripts/stripe-setup.ts. Falls
// back to the account default (undefined) if it isn't found.
export async function portalConfiguration(): Promise<string | undefined> {
  if (portalConfigId) return portalConfigId;
  const list = await stripe().billingPortal.configurations.list({ active: true, limit: 100 });
  const ours = list.data.find((c) => c.metadata?.app === STRIPE_APP_TAG);
  portalConfigId = ours?.id ?? null;
  return portalConfigId ?? undefined;
}
