import { desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { billingAccounts, customers, organizations } from "@/db/schema";
import { requireStaff } from "@/lib/auth/staff";
import { agencyOwner } from "@/lib/billing/accounts";
import { getBillingSummary, statusLabel } from "@/lib/billing/summary";
import { isBillingConfigured, isLiveMode } from "@/lib/billing/stripe";
import { PLANS, isPlanId } from "@/lib/billing/plans";
import { PageHeader } from "@/components/layout/page-header";
import { BillingPanel } from "@/components/billing/billing-panel";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminBillingPage = async ({ searchParams }: { searchParams: Promise<{ billing?: string }> }) => {
  const { billing: notice } = await searchParams;
  const viewer = await requireStaff();

  // Agency staff: their agency's own subscription.
  if (viewer.kind === "agency") {
    const owner = await agencyOwner(viewer.organizationId);
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Billing" description="Your agency's plan — one bill for all your clients" />
        {notice === "success" && (
          <p className="rounded-xl bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:text-emerald-300">
            Thanks — your subscription is set up. It can take a few seconds to show here.
          </p>
        )}
        {owner && owner.kind === "agency" ? (
          <div className="max-w-3xl">
            <BillingPanel summary={await getBillingSummary(owner)} mode="self" chooseCurrency title="Agency plan" />
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">This agency isn&apos;t billed.</CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Platform: every billing account.
  const rows = isBillingConfigured()
    ? await db
        .select({
          id: billingAccounts.id,
          kind: billingAccounts.kind,
          plan: billingAccounts.plan,
          livemode: billingAccounts.livemode,
          status: billingAccounts.status,
          currency: billingAccounts.currency,
          periodEnd: billingAccounts.currentPeriodEnd,
          suspendedAt: billingAccounts.suspendedAt,
          customerId: billingAccounts.customerId,
          customerName: customers.businessName,
          agencyName: organizations.name,
        })
        .from(billingAccounts)
        .leftJoin(customers, eq(billingAccounts.customerId, customers.id))
        .leftJoin(organizations, eq(billingAccounts.organizationId, organizations.id))
        .orderBy(desc(billingAccounts.updatedAt))
    : [];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Billing"
        description="Direct customers and agencies with a billing account. Start a customer's billing from their page."
      />
      {!isBillingConfigured() ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Billing isn&apos;t set up yet.</CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">No billing accounts yet.</CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-foreground/[0.07]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Renews / ends</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.customerId ? (
                        <a href={`/admin/customers/${r.customerId}`} className="hover:underline">
                          {r.customerName}
                        </a>
                      ) : (
                        r.agencyName ?? "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {r.kind === "agency" ? "Agency" : "Direct"}
                      {r.livemode !== isLiveMode() && (
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground">
                          {r.livemode ? "live" : "test"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{isPlanId(r.plan) ? PLANS[r.plan].name : "—"}</TableCell>
                    <TableCell>
                      {statusLabel(r.status)[0]}
                      {r.suspendedAt && <span className="ml-1 text-red-600 dark:text-red-400">(calls off)</span>}
                    </TableCell>
                    <TableCell>{r.currency?.toUpperCase() ?? "—"}</TableCell>
                    <TableCell>{r.periodEnd ? r.periodEnd.toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </div>
      )}
    </div>
  );
};

export default AdminBillingPage;
