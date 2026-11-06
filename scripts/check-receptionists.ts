/**
 * Compares every receptionist on its voice platform with the app's settings
 * (the same check the daily cron runs).
 *
 * Usage:
 *   npx tsx scripts/check-receptionists.ts            # report only, changes nothing
 *   npx tsx scripts/check-receptionists.ts --repair   # push the app's settings where they differ
 */
import { db } from "../db/drizzle";
import { customers, vapiAgents } from "../db/schema";
import { eq } from "drizzle-orm";
import { checkReceptionist } from "../lib/services/receptionist-health";

async function run(): Promise<void> {
  const repair = process.argv.includes("--repair");
  const rows = await db
    .select({ customerId: vapiAgents.customerId, provider: vapiAgents.provider, name: customers.businessName })
    .from(vapiAgents)
    .innerJoin(customers, eq(vapiAgents.customerId, customers.id));

  console.log(`${repair ? "Checking and repairing" : "Checking (read-only)"} ${rows.length} receptionist(s)\n`);
  for (const r of rows) {
    const result = await checkReceptionist(r.customerId, { repair });
    const label = `${r.name} [${r.provider}]`;
    if (result.status === "healthy") console.log(`ok       ${label}`);
    else if (result.status === "repaired") console.log(`REPAIRED ${label}: ${result.problems.join("; ")}`);
    else if (result.status === "broken") console.log(`PROBLEM  ${label}: ${result.problems.join("; ") || result.error}`);
    else console.log(`skipped  ${label}: ${result.reason}`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
