import { config } from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not defined in the environment variables. - error source: db/drizzle.ts"
  );
}

// Every neon-http query is its own HTTPS request, so a flaky network surfaces
// as random "fetch failed" errors. Retry only failures where the connection
// was never established: the query never reached Postgres, so retrying is safe
// even for writes. Errors after the request was sent are NOT retried.
const CONNECT_ERROR_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);
const MAX_ATTEMPTS = 3;

function isConnectError(err: unknown): boolean {
  let current = err as { code?: string; cause?: unknown } | undefined;
  while (current) {
    if (current.code && CONNECT_ERROR_CODES.has(current.code)) return true;
    current = current.cause as typeof current;
  }
  return false;
}

neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS || !isConnectError(err)) throw err;
      console.warn(`[db] connection failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying`);
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
};

export const db = drizzle(process.env.DATABASE_URL, { schema });
