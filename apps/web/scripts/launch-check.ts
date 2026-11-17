// pnpm launch:check [--launch 2] [--decisions docs/decisions.md] (step 13.4): fails when the database it points at
// isn't ready for a launch. Run it against production before go-live (and on staging to see what's left):
//   - any record still flagged sample (CMS collections and settings, and core tables);
//   - a legal page that isn't published, or the company and legal details still showing placeholders (M2);
//   - a published tracker record without its source or as-of date;
//   - switches that must be off in production (sample content, /dev pages; for Launch 1, ordering);
//   - an Open decision in docs/decisions.md that blocks this launch.
import { isEnabled } from "@h2india/config";
import { getDb } from "@h2india/core";
import { coreSampleCounts } from "@h2india/core/launch";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getPayload, type CollectionSlug, type Field } from "payload";
import { LEGAL_PAGES } from "../src/cms/trust/collections";
import { launchBlockers } from "../src/launch/decisions";
import config from "../src/payload.config";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const launch = opt("--launch") === "2" ? 2 : 1;
const decisionsPath = opt("--decisions") ?? fileURLToPath(new URL("../../../docs/decisions.md", import.meta.url));

const problems: string[] = [];
const notes: string[] = [];
const has = (fields: Field[], name: string) => fields.some((f) => "name" in f && f.name === name);

const payload = await getPayload({ config });

// 1 Sample content.
for (const [slug, c] of Object.entries(payload.collections)) {
  if (!has(c.config.flattenedFields as Field[], "sample")) continue;
  const { totalDocs } = await payload.count({
    collection: slug as CollectionSlug,
    where: { sample: { equals: true } },
    overrideAccess: true,
  });
  if (totalDocs) problems.push(`${slug}: ${String(totalDocs)} sample records`);
}
for (const g of payload.config.globals) {
  if (!has(g.flattenedFields as Field[], "sample")) continue;
  const doc = (await payload.findGlobal({ slug: g.slug, overrideAccess: true })) as { sample?: boolean };
  if (doc.sample) problems.push(`${g.slug}: still the sample version`);
}
for (const t of await coreSampleCounts(getDb())) problems.push(`${t.table}: ${String(t.rows)} sample rows`);

// 2 Legal pages and the company's details (M2).
for (const page of LEGAL_PAGES) {
  const { totalDocs } = await payload.count({
    collection: "legal-pages",
    where: { and: [{ slug: { equals: page.value } }, { _status: { equals: "published" } }] },
    overrideAccess: true,
  });
  if (!totalDocs) problems.push(`Legal page "${page.label}" (${page.href}) isn't published`);
}
const trust = (await payload.findGlobal({ slug: "trust-settings", overrideAccess: true })) as unknown as Record<
  string,
  unknown
>;
const officer = (trust.grievanceOfficer ?? {}) as Record<string, unknown>;
const required: [string, unknown][] = [
  ["operating company", trust.operatingCompany],
  ["GSTIN", trust.gstin],
  ["registered office", trust.registeredOffice],
  ["grievance officer's name", officer.name],
  ["grievance officer's designation", officer.designation],
  ["grievance officer's email", officer.email],
];
for (const [label, v] of required) {
  if (typeof v !== "string" || !v.trim() || /^\[.*\]$/.test(v.trim()))
    problems.push(`Company and legal details: the ${label} is empty or a placeholder (M2)`);
}

// 3 Tracker figures need their source and as-of date.
for (const [slug, c] of Object.entries(payload.collections)) {
  if (!slug.startsWith("tracker-")) continue;
  const source = (c.config.flattenedFields as Field[]).find((f) => "name" in f && f.name === "source");
  if (!source || source.type !== "group") continue;
  const { totalDocs } = await payload.count({
    collection: slug as CollectionSlug,
    where: {
      and: [
        { _status: { equals: "published" } },
        { or: [{ "source.name": { exists: false } }, { "source.asOf": { exists: false } }] },
      ],
    },
    overrideAccess: true,
  });
  if (totalDocs) problems.push(`${slug}: ${String(totalDocs)} published records without a source or as-of date`);
}

// 4 Switches.
if (isEnabled("sampleContent")) problems.push("FLAG_SAMPLE_CONTENT is on");
if (isEnabled("devPages")) problems.push("FLAG_DEV_PAGES is on");
if (launch === 1 && isEnabled("transactions")) problems.push("transactions is on (ordering opens at Launch 2)");
if (launch === 2 && (process.env.PAYMENT_PARTNER ?? "sim") === "sim")
  problems.push("PAYMENT_PARTNER is still the simulated partner (M3)");
if (!isEnabled("operatorPassword"))
  notes.push("operatorPassword is off: operators can use the back office without the staff password sign-in");

// 5 Decisions.
if (existsSync(decisionsPath)) {
  for (const b of launchBlockers(readFileSync(decisionsPath, "utf8"), launch))
    problems.push(`Decision ${b.id} is Open and blocks ${b.blocks}: ${b.question}`);
} else {
  notes.push(`Decisions not checked: ${decisionsPath} not found (pass --decisions <file>)`);
}

console.log(`Launch ${String(launch)} check`);
for (const n of notes) console.log(`  note: ${n}`);
if (problems.length) {
  for (const p of problems) console.log(`  ✗ ${p}`);
  console.log(`${String(problems.length)} problems: not ready.`);
} else {
  console.log("  ✓ Ready.");
}
process.exit(problems.length ? 1 : 0);
