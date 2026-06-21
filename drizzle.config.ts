import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not defined in the environment variables - error source: drizzle.config.ts"
  );
}

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
