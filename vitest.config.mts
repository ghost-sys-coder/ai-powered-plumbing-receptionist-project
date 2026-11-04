import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // Unit tests never touch the database, but importing db/drizzle requires
    // the variable to exist. A placeholder keeps tests runnable without .env.
    env: { DATABASE_URL: "postgres://test:test@localhost:5432/test" },
  },
});
