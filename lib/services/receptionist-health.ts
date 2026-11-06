import { and, asc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { vapiAgents } from "@/db/schema";
import { getCustomerReceptionist } from "@/lib/voice";
import { receptionistConfig } from "@/lib/services/receptionist-sync";

// Keeps each receptionist on its voice platform matching the app.
//
// The app is the source of truth for an agent's settings. A save in the voice
// platform's own dashboard can silently drop settings it has no form for (a
// Vapi dashboard save once stripped the call-details capture, and calls
// stopped recording anything). So the agent is compared with what the app
// would push, and pushed again when they differ:
// - daily for every receptionist (app/api/cron/receptionist-health), and
// - after any call that comes back with no captured details (the webhooks).

export type HealthResult =
  | { status: "healthy" }
  | { status: "repaired"; problems: string[] }
  | { status: "broken"; problems: string[]; error: string }
  | { status: "skipped"; reason: string };

// A call with no details shouldn't re-check the same agent on every call
// while a repair keeps failing.
const CALL_TRIGGER_COOLDOWN_MS = 10 * 60 * 1000;

async function record(
  customerId: string,
  fields: Partial<Pick<typeof vapiAgents.$inferInsert, "configRepairedAt" | "configRepairedProblems" | "configError">>
) {
  await db
    .update(vapiAgents)
    .set({ configCheckedAt: new Date(), ...fields })
    .where(eq(vapiAgents.customerId, customerId));
}

// Checks one customer's receptionist and, unless `repair` is false, pushes the
// app's settings back when it has drifted. Never throws: failures come back as
// "broken" (and are stored on the agent for the admin console).
export async function checkReceptionist(
  customerId: string,
  opts: { repair?: boolean } = {}
): Promise<HealthResult> {
  const repair = opts.repair ?? true;
  let problems: string[] = [];
  try {
    const [config, receptionist] = await Promise.all([
      receptionistConfig(customerId),
      getCustomerReceptionist(customerId),
    ]);
    if (!config || !receptionist) return { status: "skipped", reason: "No receptionist" };

    problems = await receptionist.provider.checkAgent(receptionist.agentId, config);
    if (problems.length === 0) {
      await record(customerId, { configError: null });
      return { status: "healthy" };
    }
    if (!repair) return { status: "broken", problems, error: "Not repaired (check only)" };

    // An agent that no longer exists can't be repaired by pushing settings.
    if (problems.some((p) => p.includes("no longer exists"))) {
      const error = problems.join("; ");
      await record(customerId, { configError: error });
      return { status: "broken", problems, error };
    }

    await receptionist.provider.updateAgent(receptionist.agentId, config);
    const after = await receptionist.provider.checkAgent(receptionist.agentId, config);
    if (after.length > 0) {
      const error = `Still different after repair: ${after.join("; ")}`;
      await record(customerId, { configError: error });
      return { status: "broken", problems, error };
    }

    await record(customerId, { configError: null, configRepairedAt: new Date(), configRepairedProblems: problems });
    console.warn(`[receptionist-health] repaired ${customerId}: ${problems.join("; ")}`);
    return { status: "repaired", problems };
  } catch (err) {
    const error = (err as Error).message || String(err);
    console.error(`[receptionist-health] check failed for ${customerId}`, err);
    // Only store a failure we're sure about: a platform outage on a healthy
    // agent shouldn't light up the admin console.
    if (problems.length > 0) await record(customerId, { configError: error }).catch(() => {});
    return { status: "broken", problems, error };
  }
}

// For the webhooks: a call came back with no captured details, which is what
// a stripped agent looks like. Re-checks (and repairs) unless it was checked
// in the last few minutes.
export async function checkReceptionistAfterEmptyCall(customerId: string): Promise<HealthResult> {
  const cutoff = new Date(Date.now() - CALL_TRIGGER_COOLDOWN_MS);
  const [recent] = await db
    .select({ id: vapiAgents.id })
    .from(vapiAgents)
    .where(
      and(eq(vapiAgents.customerId, customerId), isNotNull(vapiAgents.configCheckedAt), gt(vapiAgents.configCheckedAt, cutoff))
    )
    .limit(1);
  if (recent) return { status: "skipped", reason: "Checked recently" };
  const result = await checkReceptionist(customerId);
  console.log(`[receptionist-health] after empty call for ${customerId}: ${result.status}`);
  return result;
}

export type HealthSweep = {
  checked: number;
  healthy: number;
  repaired: Array<{ customerId: string; problems: string[] }>;
  broken: Array<{ customerId: string; error: string }>;
  remaining: number;
};

// Checks every receptionist, least recently checked first, until the time
// budget runs out (the rest are picked up by the next run).
export async function checkAllReceptionists(opts: { budgetMs: number; concurrency?: number }): Promise<HealthSweep> {
  const deadline = Date.now() + opts.budgetMs;
  const rows = await db
    .select({ customerId: vapiAgents.customerId })
    .from(vapiAgents)
    .orderBy(sql`${vapiAgents.configCheckedAt} asc nulls first`, asc(vapiAgents.createdAt));

  const sweep: HealthSweep = { checked: 0, healthy: 0, repaired: [], broken: [], remaining: 0 };
  const queue = rows.map((r) => r.customerId);

  async function worker() {
    while (queue.length > 0 && Date.now() < deadline) {
      const customerId = queue.shift()!;
      const result = await checkReceptionist(customerId);
      sweep.checked++;
      if (result.status === "healthy") sweep.healthy++;
      else if (result.status === "repaired") sweep.repaired.push({ customerId, problems: result.problems });
      else if (result.status === "broken") sweep.broken.push({ customerId, error: result.error });
    }
  }
  await Promise.all(Array.from({ length: opts.concurrency ?? 3 }, worker));
  sweep.remaining = queue.length;
  return sweep;
}
