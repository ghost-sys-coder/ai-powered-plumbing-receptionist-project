import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/services/admin-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { EditCustomerForm } from "@/components/admin/edit-customer-form";
import type { BusinessHoursValue } from "@/components/admin/business-hours-input";
import type { ServiceEntry } from "@/components/admin/services-input";

interface Props {
  params: Promise<{ id: string }>;
}

const DEFAULT_HOURS: BusinessHoursValue = {
  Monday:    { open: "08:00", close: "17:00", closed: false },
  Tuesday:   { open: "08:00", close: "17:00", closed: false },
  Wednesday: { open: "08:00", close: "17:00", closed: false },
  Thursday:  { open: "08:00", close: "17:00", closed: false },
  Friday:    { open: "08:00", close: "17:00", closed: false },
  Saturday:  { open: "09:00", close: "13:00", closed: false },
  Sunday:    { open: "",      close: "",       closed: true  },
};

const EditCustomerPage = async ({ params }: Props) => {
  const { id } = await params;
  const data = await getCustomerDetail(id);

  if (!data) notFound();

  const { customer, agent } = data;

  const pricing = (agent?.pricingTable as Record<string, unknown> | null) ?? {};
  const initial = {
    businessName:        customer.businessName,
    ownerName:           customer.ownerName,
    email:               customer.email,
    phone:               customer.phone ?? "",
    address:             customer.address ?? "",
    city:                customer.city ?? "",
    state:               customer.state ?? "",
    timezone:            customer.timezone,
    serviceArea:         customer.serviceArea ?? "",
    emergencyDefinition: agent?.emergencyDefinition ?? "",
    businessHours:       (agent?.businessHours as BusinessHoursValue | null) ?? DEFAULT_HOURS,
    servicesOffered:     (agent?.servicesOffered as ServiceEntry[] | null) ?? [],
    serviceCallFee:      String(pricing.serviceCallFee ?? ""),
    hourlyRate:          String(pricing.hourlyRate ?? ""),
    afterHoursSurcharge: String(pricing.afterHoursSurcharge ?? ""),
    freeEstimates:       Boolean(pricing.freeEstimates),
    plan:                customer.plan,
    stripeCustomerId:    customer.stripeCustomerId ?? "",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href={`/admin/customers/${id}`}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to customer
      </Link>

      <PageHeader
        title={`Edit — ${customer.businessName}`}
        description="Changes are saved to the database and synced to the Vapi assistant."
      />

      <EditCustomerForm customerId={id} initial={initial} />
    </div>
  );
};

export default EditCustomerPage;
