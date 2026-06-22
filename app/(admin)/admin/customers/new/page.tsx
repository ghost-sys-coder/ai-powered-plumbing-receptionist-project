import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { NewCustomerForm } from "@/components/admin/new-customer-form";

const NewCustomerPage = () => {
  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/admin"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← All customers
      </Link>
      <PageHeader
        title="New customer"
        description="Provision a new plumbing business account"
      />
      <NewCustomerForm />
    </div>
  );
};

export default NewCustomerPage;
