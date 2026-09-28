/**
 * Marks existing migrations as applied in drizzle.__drizzle_migrations.
 *
 * Why: early phases used `drizzle-kit push`, which changes the schema without
 * recording anything, so the DB had every table but an empty migration history.
 * `drizzle-kit migrate` would then replay 0000 against existing tables. This
 * records each journal entry exactly as drizzle's migrator would have
 * (sha256 of the SQL file, created_at = journal "when").
 *
 * ONLY run this against a DB whose schema already matches the migrations —
 * verify first. Idempotent: entries already recorded are skipped.
 *
 * Usage:
 *   npx tsx scripts/baseline-migrations.ts           # dry run (prints plan)
 *   npx tsx scripts/baseline-migrations.ts --apply   # writes the entries
 */
import { config } from "dotenv";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { sql } from "drizzle-orm";

import { db } from "../db/drizzle";

config({ path: ".env" });

type JournalEntry = { idx: number; tag: string; when: number };
const rows = (r: unknown) => ((r as { rows?: unknown[] }).rows ?? r) as Array<Record<string, unknown>>;

async function run(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const journal = JSON.parse(readFileSync("db/migrations/meta/_journal.json", "utf8")) as {
    entries: JournalEntry[];
  };

  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`);

  const recorded = new Set(
    rows(await db.execute(sql`select created_at from drizzle.__drizzle_migrations`)).map((r) =>
      Number(r.created_at)
    )
  );

  for (const entry of journal.entries) {
    const hash = createHash("sha256")
      .update(readFileSync(`db/migrations/${entry.tag}.sql`, "utf8"))
      .digest("hex");
    if (recorded.has(entry.when)) {
      console.log(`= ${entry.tag} already recorded`);
      continue;
    }
    if (apply) {
      await db.execute(
        sql`insert into drizzle.__drizzle_migrations ("hash", "created_at") values (${hash}, ${entry.when})`
      );
      console.log(`+ ${entry.tag} recorded as applied`);
    } else {
      console.log(`would record ${entry.tag} (when ${entry.when})`);
    }
  }

  // Same decision drizzle's migrator makes: run every file newer than the
  // latest recorded created_at.
  const [latest] = rows(
    await db.execute(sql`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`)
  );
  const pending = journal.entries.filter((e) => !latest || Number(latest.created_at) < e.when);
  console.log(
    `\n\`drizzle-kit migrate\` would now run: ${pending.length ? pending.map((e) => e.tag).join(", ") : "nothing"}`
  );
  if (!apply) console.log("(dry run — pass --apply to write)");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
