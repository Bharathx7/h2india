import { createDb } from "@h2india/db";
import { RETENTION_RULES, runRetention, type RetentionRule } from "../src/compliance/retention";

// What the retention job would remove (step 12.2). Never changes anything:
//   pnpm privacy:retention                              periods from the privacy.retention setting
//   pnpm privacy:retention --days sessions-expired=30   what-if periods (repeat --days)
const periods: Partial<Record<RetentionRule, number>> = {};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] !== "--days") continue;
  const [rule, n] = (args[i + 1] ?? "").split("=");
  if (!RETENTION_RULES.includes(rule as RetentionRule) || !Number(n)) {
    console.error(`--days needs <rule>=<days>; rules: ${RETENTION_RULES.join(", ")}`);
    process.exit(1);
  }
  periods[rule as RetentionRule] = Number(n);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const { db, pool } = createDb(url, { max: 1 });
try {
  const { lines } = await runRetention(db, { periods: Object.keys(periods).length ? periods : undefined });
  console.table(
    lines.map((l) => ({
      rule: l.rule,
      action: l.action,
      period: l.days === null ? "not decided" : `${String(l.days)} days`,
      "past the record's end": l.ended,
      "would change": l.due ?? "-",
    })),
  );
  console.log("Dry run: nothing was changed.");
} finally {
  await pool.end();
}
