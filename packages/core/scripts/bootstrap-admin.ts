import { createDb } from "@h2india/db";
import { bootstrapSuperAdmin, OperatorRoleError } from "../src/authz/grants";

// Makes the first Super admin on a new server (step 1.7, docs/runbooks/deploy.md):
//   pnpm admin:bootstrap you@example.com "Your Name"
// Refuses once any Super admin exists. The person then signs in with an email code.
const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ").trim();
if (!email?.includes("@") || !name) {
  console.error('Usage: pnpm admin:bootstrap <email> "<full name>"');
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const { db, pool } = createDb(url, { max: 1 });
try {
  const result = await bootstrapSuperAdmin(db, { email, name });
  console.log(
    `Super admin ready (${result.created ? "new account" : "existing account"}). Sign in with an email code.`,
  );
} catch (error) {
  if (error instanceof OperatorRoleError) {
    console.error(error.message);
    process.exitCode = 1;
  } else throw error;
} finally {
  await pool.end();
}
