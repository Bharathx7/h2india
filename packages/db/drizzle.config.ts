import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` writes reviewed SQL migrations from the schema. They are applied by `pnpm db:migrate`.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  schemaFilter: ["core"],
  casing: "snake_case",
  migrations: { schema: "core", table: "migrations" },
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
