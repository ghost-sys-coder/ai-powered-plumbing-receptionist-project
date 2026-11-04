import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { organizations } from "@/db/schema";

// Database-only agency helpers, kept free of Clerk so CLI scripts can use them.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAgency(id: string) {
  // Malformed ids would make Postgres throw; treat them as "not found".
  if (!UUID_RE.test(id)) return null;
  const [row] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return row ?? null;
}

// The agency that owns businesses buying directly from the platform. Created
// by migration 0006; created here too if it is ever missing.
export async function getHouseAgencyId(): Promise<string> {
  const [row] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.isHouse, true))
    .limit(1);
  if (row) return row.id;

  const [created] = await db
    .insert(organizations)
    .values({ name: "Direct customers", isHouse: true })
    .onConflictDoNothing()
    .returning({ id: organizations.id });
  if (created) return created.id;

  // Lost a race with a concurrent insert — read the winner.
  const [winner] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.isHouse, true))
    .limit(1);
  return winner.id;
}
