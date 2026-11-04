import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { customers, vapiAgents } from "@/db/schema";
import { getCustomerReceptionist } from "@/lib/voice";
import { extractAreaCode } from "@/lib/services/vapi-provisioning";
import { storedProfile } from "@/lib/services/profile-input";

export type AddNumberResult =
  | { ok: true; phoneNumber: string }
  | { ok: false; status: 404 | 409; error: string };

// Issues a number for a customer whose receptionist has none: setup ran
// before their country was supported (e.g. before a UK bundle was approved),
// or phone provisioning was off. Throws PhoneNumberUnavailableError when the
// country still can't be served.
export async function addPhoneNumberToCustomer(customerId: string): Promise<AddNumberResult> {
  const [row] = await db
    .select({
      businessName: customers.businessName,
      phone: customers.phone,
      industry: customers.industry,
      country: customers.country,
      businessDescription: customers.businessDescription,
      phoneNumberId: vapiAgents.vapiPhoneNumberId,
    })
    .from(vapiAgents)
    .innerJoin(customers, eq(vapiAgents.customerId, customers.id))
    .where(eq(vapiAgents.customerId, customerId))
    .limit(1);
  if (!row) return { ok: false, status: 404, error: "This customer has no receptionist yet" };
  if (row.phoneNumberId) return { ok: false, status: 409, error: "This receptionist already has a number" };

  const receptionist = await getCustomerReceptionist(customerId);
  if (!receptionist) return { ok: false, status: 404, error: "This customer has no receptionist yet" };
  const { provider, agentId } = receptionist;

  const number = await provider.provisionPhoneNumber({
    country: storedProfile(row).country,
    areaCode: extractAreaCode(row.phone),
    label: row.businessName,
  });

  try {
    await provider.attachPhoneNumber(number.phoneNumberId, agentId);
    const updated = await db
      .update(vapiAgents)
      .set({
        vapiPhoneNumberId: number.phoneNumberId,
        phoneNumber: number.phoneNumber,
        phoneNumberSource: number.source,
      })
      // Guards a double click: only the first request keeps its number.
      .where(and(eq(vapiAgents.customerId, customerId), isNull(vapiAgents.vapiPhoneNumberId)))
      .returning({ id: vapiAgents.id });
    if (updated.length === 0) {
      await provider.deleteResources({ phoneNumberId: number.phoneNumberId });
      return { ok: false, status: 409, error: "This receptionist already has a number" };
    }
  } catch (err) {
    await provider.deleteResources({ phoneNumberId: number.phoneNumberId });
    throw err;
  }

  return { ok: true, phoneNumber: number.phoneNumber };
}
