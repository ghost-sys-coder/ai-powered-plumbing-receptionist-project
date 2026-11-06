import { redirect } from "next/navigation";
import { getCustomerId } from "@/lib/auth/get-customer-id";
import { billingOwnerForCustomer } from "@/lib/billing/accounts";
import { getBillingSummary } from "@/lib/billing/summary";
import { PageHeader } from "@/components/layout/page-header";
import { BillingPanel } from "@/components/billing/billing-panel";
import { Card, CardContent } from "@/components/ui/card";

const BillingPage = async ({ searchParams }: { searchParams: Promise<{ billing?: string }> }) => {
  const { billing: notice } = await searchParams;
  const customerId = await getCustomerId();
  if (!customerId) redirect("/dashboard");
  const owner = await billingOwnerForCustomer(customerId);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader eyebrow="Billing" title="Your plan" description="Your plan, minutes used this month, and invoices." />

      {notice === "success" && (
        <p className="rounded-xl bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:text-emerald-300">
          Thanks — your subscription is set up. It can take a few seconds to show here.
        </p>
      )}

      {!owner || owner.kind === "exempt" ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Your account isn&apos;t billed through this dashboard.
          </CardContent>
        </Card>
      ) : owner.kind === "agency" ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Billing for your receptionist is handled by {owner.name}. Contact them about your plan or invoices.
          </CardContent>
        </Card>
      ) : (
        <div className="max-w-3xl">
          <BillingPanel summary={await getBillingSummary(owner)} mode="self" title="Subscription" />
        </div>
      )}
    </div>
  );
};

export default BillingPage;
