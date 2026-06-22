import Link from "next/link";
import { getAllCustomers, getCustomerStats } from "@/lib/services/admin-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { CustomersTable } from "@/components/admin/customers-table";
import { Button } from "@/components/ui/button";

const AdminPage = async () => {
  const [customerList, stats] = await Promise.all([
    getAllCustomers(),
    getCustomerStats(),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Customers"
        action={
          <Link href="/admin/customers/new">
            <Button>Add customer</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total customers" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Onboarding" value={stats.onboarding} />
        <StatCard label="Churned" value={stats.churned} />
      </div>

      <CustomersTable customers={customerList} />
    </div>
  );
};

export default AdminPage;
