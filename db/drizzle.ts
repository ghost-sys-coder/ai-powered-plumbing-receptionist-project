import { config } from "dotenv";
import { drizzle } from 'drizzle-orm/neon-http';

config({ path: ".env" }); // or .env.local

if(!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment variables. - error source: db/drizzle.ts");
}

export const db = drizzle(process.env.DATABASE_URL!);
