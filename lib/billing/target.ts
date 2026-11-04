import { auth, currentUser } from "@clerk/nextjs/server";
import { getStaffViewer, canAccessCustomer } from "@/lib/auth/staff";
import { getCustomerId } from "@/lib/auth/get-customer-id";
import { agencyOwner, billingOwnerForCustomer, type BillingOwner } from "./accounts";
import type { BillingCurrency } from "./plans";

export type BillingTarget = {
  owner: Exclude<BillingOwner, { kind: "exempt" }>;
  email: string | null;
  currency: BillingCurrency;
  // Staff acting for someone else get a link to send, not a redirect.
  onBehalf: boolean;
  returnPath: string;
};

export type TargetResult = { ok: true; target: BillingTarget } | { ok: false; status: number; error: string };

async function signedInEmail(): Promise<string | null> {
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress ?? null;
}

// Which billing account the signed-in person may act on:
//   client           — their own business, if it's billed directly
//   agency staff     — their agency's account (customerId is ignored)
//   platform admin   — any direct customer, or the agency of an agency customer
export async function resolveBillingTarget(customerId?: string | null): Promise<TargetResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, status: 401, error: "Sign in first." };

  const viewer = await getStaffViewer();

  if (viewer?.kind === "agency") {
    const owner = await agencyOwner(viewer.organizationId);
    if (!owner || owner.kind === "exempt") return { ok: false, status: 400, error: "This agency isn't billed." };
    return {
      ok: true,
      target: { owner, email: await signedInEmail(), currency: "usd", onBehalf: false, returnPath: "/admin/billing" },
    };
  }

  if (viewer?.kind === "platform") {
    if (!customerId) return { ok: false, status: 400, error: "Choose a customer." };
    if (!(await canAccessCustomer(viewer, customerId))) return { ok: false, status: 404, error: "Customer not found" };
    const owner = await billingOwnerForCustomer(customerId);
    if (!owner) return { ok: false, status: 404, error: "Customer not found" };
    if (owner.kind === "exempt") return { ok: false, status: 400, error: "Pilot customers aren't billed." };
    return {
      ok: true,
      target: {
        owner,
        email: owner.kind === "direct" ? owner.email : null,
        currency: owner.kind === "direct" ? owner.currency : "usd",
        onBehalf: true,
        returnPath: owner.kind === "direct" ? "/dashboard/billing" : "/admin/billing",
      },
    };
  }

  // A business owner.
  const ownCustomerId = await getCustomerId();
  if (!ownCustomerId) return { ok: false, status: 404, error: "No business is linked to this account." };
  const owner = await billingOwnerForCustomer(ownCustomerId);
  if (!owner) return { ok: false, status: 404, error: "No business is linked to this account." };
  if (owner.kind === "exempt") return { ok: false, status: 400, error: "Your plan isn't billed." };
  if (owner.kind === "agency") {
    return { ok: false, status: 403, error: `Billing is handled by ${owner.name}.` };
  }
  return {
    ok: true,
    target: { owner, email: owner.email, currency: owner.currency, onBehalf: false, returnPath: "/dashboard/billing" },
  };
}

