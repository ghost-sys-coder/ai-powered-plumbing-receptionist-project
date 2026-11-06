import { count, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { customers } from "@/db/schema";
import { agencyOwner, findAccount } from "./accounts";
import { clientLimitFor } from "./plans";

export type ClientAllowance = {
  // Max clients the agency's plan covers; null = no limit applies.
  limit: number | null;
  used: number;
  planName: string | null;
};

export async function countAgencyClients(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(customers)
    .where(eq(customers.organizationId, organizationId));
  return row?.n ?? 0;
}

export async function agencyClientAllowance(organizationId: string): Promise<ClientAllowance> {
  const owner = await agencyOwner(organizationId);
  // The house agency's customers are billed one by one; no client limit.
  if (!owner || owner.kind !== "agency") return { limit: null, used: 0, planName: null };
  const account = await findAccount(owner);
  const { limit, planName } = clientLimitFor(account);
  if (limit === null) return { limit, used: 0, planName };
  return { limit, used: await countAgencyClients(organizationId), planName };
}
