import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { getCustomerDetail } from "@/lib/services/admin-dashboard";
import { getCachedLiveAssistantPhoneNumber } from "@/lib/services/live-phone";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerAccountCard } from "@/components/admin/customer-account-card";
import { CustomerAgentCard } from "@/components/admin/customer-agent-card";
import { CustomerRecentCalls } from "@/components/admin/customer-recent-calls";
import { CustomerBookings } from "@/components/admin/customer-bookings";
import { WebCallPanel } from "@/components/admin/web-call-panel";
import { DeleteCustomerButton } from "@/components/admin/delete-customer-button";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

const CustomerDetailPage = async ({ params }: Props) => {
  const { id } = await params;

  const [data, linkedUserRows] = await Promise.all([
    getCustomerDetail(id),
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
    ? await getCachedLiveAssistantPhoneNumber({
        phoneNumberId: agent.vapiPhoneNumberId,
        assistantId: agent.vapiAssistantId,
      })
    : null;

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/admin"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
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
        <CustomerBookings bookings={upcomingBookings} />
      </div>
    </div>
  );
};

export default CustomerDetailPage;
