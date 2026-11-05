import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { getCustomerDetail } from "@/lib/services/admin-dashboard";
import { requireStaff } from "@/lib/auth/staff";
import { getCachedLiveAssistantPhoneNumber } from "@/lib/services/live-phone";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerAccountCard } from "@/components/admin/customer-account-card";
import { CustomerAgentCard } from "@/components/admin/customer-agent-card";
import { CustomerRecentCalls } from "@/components/admin/customer-recent-calls";
import { CustomerBookings } from "@/components/admin/customer-bookings";
import { WebCallPanel } from "@/components/admin/web-call-panel";
import { GoogleCalendarConnect } from "@/components/integrations/google-calendar-connect";
import { getCalendarConnection } from "@/lib/services/calendar-connections";
import { isGoogleOAuthConfigured } from "@/lib/google/oauth";
import { DeleteCustomerButton } from "@/components/admin/delete-customer-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BillingPanel } from "@/components/billing/billing-panel";
import { billingOwnerForCustomer } from "@/lib/billing/accounts";
import { getBillingSummary } from "@/lib/billing/summary";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ calendar?: string }>;
}

const CustomerDetailPage = async ({ params, searchParams }: Props) => {
  const { id } = await params;
  const { calendar: calendarNotice } = await searchParams;
  const viewer = await requireStaff();

  const [data, linkedUserRows] = await Promise.all([
    getCustomerDetail(id, viewer),
    db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.customerId, id), isNull(users.deletedAt)))
      .limit(1),
  ]);

  if (!data) notFound();

  const { customer, agent, recentCalls, upcomingBookings } = data;
  const linkedUser = linkedUserRows[0] ?? null;

  // Live phone number attached to the assistant in Vapi (source of truth).
  const livePhone = agent
    ? await getCachedLiveAssistantPhoneNumber({ customerId: agent.customerId })
    : null;

  // Direct customers are billed one by one; agency clients through their agency.
  const billingOwner = await billingOwnerForCustomer(customer.id);

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/admin"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ← All customers
      </Link>

      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={customer.businessName}
          description={`${customer.ownerName} · ${customer.email}`}
        />
        <div className="flex items-center gap-2">
          <Link href={`/admin/customers/${customer.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
          <DeleteCustomerButton
            customerId={customer.id}
            businessName={customer.businessName}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomerAccountCard
          customer={customer}
          hasActiveLogin={linkedUser !== null}
          linkedUserEmail={linkedUser?.email ?? null}
        />
        <CustomerAgentCard agent={agent} livePhoneNumber={livePhone?.number ?? null} />
      </div>

      {billingOwner?.kind === "direct" && viewer.kind === "platform" && (
        <BillingPanel
          summary={await getBillingSummary(billingOwner)}
          mode="staff"
          customerId={customer.id}
        />
      )}
      {billingOwner?.kind === "agency" && viewer.kind === "platform" && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Billed through the agency {billingOwner.name}.
          </CardContent>
        </Card>
      )}

      {agent && (
        <GoogleCalendarConnect
          customerId={customer.id}
          configured={isGoogleOAuthConfigured()}
          connection={await getCalendarConnection(customer.id)}
          returnTo={`/admin/customers/${customer.id}`}
          notice={calendarNotice ?? null}
        />
      )}

      {agent && (
        <WebCallPanel
          customerId={customer.id}
          agentStatus={agent.status}
          phoneNumber={agent.phoneNumber ?? null}
          ownerName={agent.ownerName ?? null}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <CustomerRecentCalls calls={recentCalls} customerId={customer.id} />
        <CustomerBookings bookings={upcomingBookings} timezone={customer.timezone} />
      </div>
    </div>
  );
};

export default CustomerDetailPage;
