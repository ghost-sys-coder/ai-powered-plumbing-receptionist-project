import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { NewCustomerForm } from "@/components/admin/new-customer-form";
import { requireStaff } from "@/lib/auth/staff";
import { listAgencyOptions } from "@/lib/services/agencies";

const NewCustomerPage = async () => {
  const viewer = await requireStaff();
  // Platform admins choose which agency owns the customer; agency staff always
  // create customers in their own agency.
  const agencies = viewer.kind === "platform" ? await listAgencyOptions() : null;

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/admin"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ← All customers
      </Link>
      <PageHeader
        title="New customer"
        description="Set up a new business and its AI receptionist"
      />
      <NewCustomerForm agencies={agencies} />
    </div>
  );
};

export default NewCustomerPage;
