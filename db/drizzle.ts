import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not defined in the environment variables. - error source: db/drizzle.ts"
  );
}

export const db = drizzle(process.env.DATABASE_URL, { schema });
