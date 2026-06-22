import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/services/admin-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerAccountCard } from "@/components/admin/customer-account-card";
import { CustomerAgentCard } from "@/components/admin/customer-agent-card";
import { CustomerRecentCalls } from "@/components/admin/customer-recent-calls";
import { CustomerBookings } from "@/components/admin/customer-bookings";

interface Props {
  params: Promise<{ id: string }>;
}

const CustomerDetailPage = async ({ params }: Props) => {
  const { id } = await params;
  const data = await getCustomerDetail(id);

  if (!data) notFound();

  const { customer, agent, recentCalls, upcomingBookings } = data;

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/admin"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← All customers
      </Link>

      <PageHeader
        title={customer.businessName}
        description={`${customer.ownerName} · ${customer.email}`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CustomerAccountCard customer={customer} />
        <CustomerAgentCard agent={agent} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomerRecentCalls calls={recentCalls} customerId={customer.id} />
        <CustomerBookings bookings={upcomingBookings} />
      </div>
    </div>
  );
};

export default CustomerDetailPage;
