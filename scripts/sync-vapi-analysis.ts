/**
 * Backfill / verify the Vapi structured-data analysis plan on existing assistants.
 *
 * Why: assistants created before the analysisPlan change return an `analysis`
 * with only `summary` + `successEvaluation` (no structuredData / structuredDataMulti),
 * so the webhook has nothing to extract. This re-pushes each assistant's config
 * (which now includes the analysis plan) and reads it back to confirm it stuck.
 *
 * Usage:
 *   npx tsx scripts/sync-vapi-analysis.ts            # all agents
 *   npx tsx scripts/sync-vapi-analysis.ts <assistantId>   # one assistant
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { VapiClient } from "@vapi-ai/server-sdk";

import { db } from "../db/drizzle";
import { vapiAgents, customers } from "../db/schema";
import {
  updateVapiAssistant,
  type ProvisioningConfig,
} from "../lib/services/vapi-provisioning";
import { CALL_DATA_KEY } from "../lib/services/calls";

config({ path: ".env" });

function getVapi(): VapiClient {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY is not set");
  return new VapiClient({ token: key });
}

async function run(): Promise<void> {
  const targetAssistantId = process.argv[2] ?? null;
  const vapi = getVapi();

  const rows = await db
    .select({
      assistantId: vapiAgents.vapiAssistantId,
      ownerNameAgent: vapiAgents.ownerName,
      servicesOffered: vapiAgents.servicesOffered,
      pricingTable: vapiAgents.pricingTable,
      businessHours: vapiAgents.businessHours,
      emergencyDefinition: vapiAgents.emergencyDefinition,
      businessName: customers.businessName,
      ownerNameCustomer: customers.ownerName,
      serviceArea: customers.serviceArea,
    })
    .from(vapiAgents)
    .innerJoin(customers, eq(vapiAgents.customerId, customers.id));

  const targets = targetAssistantId
    ? rows.filter((r) => r.assistantId === targetAssistantId)
    : rows;

  if (targets.length === 0) {
    console.log(
      targetAssistantId
        ? `No agent found for assistant ${targetAssistantId}`
        : "No agents found."
    );
    return;
  }

  console.log(`Syncing analysis plan for ${targets.length} assistant(s)...\n`);

  let ok = 0;
  let failed = 0;

  for (const r of targets) {
    const label = `${r.businessName} (${r.assistantId})`;
    try {
      const cfg: ProvisioningConfig = {
        businessName: r.businessName,
        ownerName: r.ownerNameAgent ?? r.ownerNameCustomer,
        serviceArea: r.serviceArea ?? "",
        servicesOffered:
          (r.servicesOffered as ProvisioningConfig["servicesOffered"]) ?? [],
        pricing: (r.pricingTable as ProvisioningConfig["pricing"]) ?? {},
        emergencyDefinition: r.emergencyDefinition ?? "",
        businessHours:
          (r.businessHours as ProvisioningConfig["businessHours"]) ?? {},
      };

      await updateVapiAssistant(r.assistantId, cfg);

      // Read back and confirm the plan actually landed on the assistant.
      const updated = await vapi.assistants.get({ id: r.assistantId });
      const multi = (updated as any)?.analysisPlan?.structuredDataMultiPlan as
        | Array<{ key?: string }>
        | undefined;
      const hasPlan = Array.isArray(multi) && multi.some((p) => p?.key === CALL_DATA_KEY);

      if (hasPlan) {
        console.log(`✅ ${label} — analysis plan present (key "${CALL_DATA_KEY}")`);
        ok++;
      } else {
        console.warn(
          `⚠️  ${label} — update sent but structuredDataMultiPlan NOT found on read-back. analysisPlan:`,
          JSON.stringify((updated as any)?.analysisPlan ?? null)
        );
        failed++;
      }
    } catch (err) {
      console.error(`❌ ${label} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} ok, ${failed} failed.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
