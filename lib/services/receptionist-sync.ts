import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import type { ProvisioningConfig } from "@/lib/services/vapi-provisioning";
import { storedProfile } from "@/lib/services/profile-input";
import { getCustomerReceptionist } from "@/lib/voice";

// Rebuilds a customer's receptionist (prompt + tools) from what is stored in
// the database and pushes it to the voice provider. Use after changing stored
// settings outside the admin forms (e.g. connecting a calendar).
export async function syncCustomerReceptionist(customerId: string): Promise<void> {
  const [row] = await db
    .select({
      businessName: customers.businessName,
      ownerNameCustomer: customers.ownerName,
      serviceArea: customers.serviceArea,
      timezone: customers.timezone,
      industry: customers.industry,
      country: customers.country,
      businessDescription: customers.businessDescription,
      ownerName: vapiAgents.ownerName,
      calendarType: vapiAgents.calendarType,
      appointmentDurationMinutes: vapiAgents.appointmentDurationMinutes,
      servicesOffered: vapiAgents.servicesOffered,
      pricingTable: vapiAgents.pricingTable,
      emergencyDefinition: vapiAgents.emergencyDefinition,
      businessHours: vapiAgents.businessHours,
      transferEnabled: vapiAgents.transferEnabled,
    })
    .from(vapiAgents)
    .innerJoin(customers, eq(vapiAgents.customerId, customers.id))
    .where(eq(vapiAgents.customerId, customerId))
    .limit(1);
  if (!row) throw new Error(`No receptionist for customer ${customerId}`);

  const config: ProvisioningConfig = {
    businessName: row.businessName,
    ownerName: row.ownerName ?? row.ownerNameCustomer,
    serviceArea: row.serviceArea ?? "",
    timezone: row.timezone ?? "America/New_York",
    calendarType: row.calendarType,
    appointmentDurationMinutes: row.appointmentDurationMinutes,
    servicesOffered: (row.servicesOffered as ProvisioningConfig["servicesOffered"]) ?? [],
    pricing: (row.pricingTable as ProvisioningConfig["pricing"]) ?? {},
    emergencyDefinition: row.emergencyDefinition ?? "",
    businessHours: (row.businessHours as ProvisioningConfig["businessHours"]) ?? {},
    liveTransferEnabled: row.transferEnabled,
    ...storedProfile(row),
  };

  const receptionist = await getCustomerReceptionist(customerId);
  if (!receptionist) throw new Error(`No receptionist for customer ${customerId}`);
  await receptionist.provider.updateAgent(receptionist.agentId, config);
}
