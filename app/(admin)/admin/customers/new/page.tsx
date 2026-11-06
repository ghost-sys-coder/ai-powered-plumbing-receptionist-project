import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { NewCustomerForm } from "@/components/admin/new-customer-form";
import { requireStaff } from "@/lib/auth/staff";
import { listAgencyOptions } from "@/lib/services/agencies";
import { canUseElevenLabs } from "@/lib/voice/availability";

const NewCustomerPage = async () => {
  const viewer = await requireStaff();
  // Platform admins choose which agency owns the customer; agency staff always
  // create customers in their own agency.
  const agencies = viewer.kind === "platform" ? await listAgencyOptions() : null;

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-6">
      <Link
        href="/admin"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        All customers
      </Link>
      <PageHeader
        eyebrow="New customer"
        title="Set up a receptionist"
        description="Five short steps. Start from their website and most of it fills itself in."
      />
      <NewCustomerForm agencies={agencies} elevenLabsAvailable={await canUseElevenLabs(viewer)} />
    </div>
  );
};

export default NewCustomerPage;
