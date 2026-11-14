import { schema } from "@h2india/db";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { audit } from "../audit";
import { getDb } from "../db";
import { listOf, yesNo } from "../importing/csv";
import { summarise, type ImportReport, type RowResult } from "../importing/report";
import { nudgeIndexer, queueIndexChange } from "../search/outbox";
import { queueProductsOf } from "../search/products";
import { GST_STATES } from "./gstin";

// Pre-seeded company profiles (step 4.6, A38): created Unclaimed with no members, so nobody can act for the company
// until it claims the profile (step 6.7). Rows are matched on `key`, so the same file can be imported again.

const { organisations: o, companyProfiles: p } = schema;

const STATE_NAMES = new Set(Object.values(GST_STATES));
const KINDS = ["supplier", "buyer", "both"] as const;

const text = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(max, `at most ${String(max)} characters`));
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), text(max).optional());

export const companyRow = z.object({
  key: text(80).pipe(z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "use lower-case letters, digits and dashes")),
  legal_name: text(200).pipe(z.string().min(2, "required")),
  trade_name: optionalText(120),
  kind: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.enum(KINDS, "supplier, buyer or both"),
  ),
  types: z.preprocess(listOf, z.array(z.string().max(40)).max(6)),
  city: optionalText(80),
  state: optionalText(60).refine(
    (v) => v === undefined || STATE_NAMES.has(v),
    "a state as GST writes it, for example Maharashtra",
  ),
  website: optionalText(200).refine(
    (v) => v === undefined || /^https?:\/\/\S+\.\S+$/.test(v),
    "a full address starting with https://",
  ),
  categories: z.preprocess(listOf, z.array(z.string().max(80)).max(20)),
  summary: optionalText(600),
  founded: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().min(1800).max(2100).optional(),
  ),
  employees: optionalText(20),
  sample: z.preprocess((v) => yesNo(v) ?? v, z.boolean("yes or no")).optional(),
});

export type CompanyRow = z.infer<typeof companyRow>;

export function slugifyCompany(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function profileValues(r: CompanyRow, sample: boolean) {
  return {
    tradeName: r.trade_name ?? r.legal_name,
    types: r.types,
    city: r.city ?? null,
    website: r.website ?? null,
    categories: r.categories,
    summary: r.summary ?? null,
    foundedYear: r.founded ?? null,
    employees: r.employees ?? null,
    sample: r.sample ?? sample,
  };
}

/**
 * Checks every row and, with `apply`, creates or updates the companies in one transaction. Nothing is written while
 * any row has a problem. `sample` marks every row as sample content (the seed).
 */
export async function importCompanies(
  rows: Record<string, unknown>[],
  opts: { apply: boolean; firstRow: number; sample?: boolean },
): Promise<ImportReport> {
  const db = getDb();
  const parsed = rows.map((raw, i) => ({ row: opts.firstRow + i, result: companyRow.safeParse(raw), raw }));
  const keys = parsed.flatMap((x) => (x.result.success ? [x.result.data.key] : []));
  const existing = keys.length
    ? await db
        .select({ key: p.importKey, organisationId: p.organisationId, profile: p, org: o })
        .from(p)
        .innerJoin(o, eq(o.id, p.organisationId))
        .where(inArray(p.importKey, keys))
    : [];
  const byKey = new Map(existing.map((e) => [e.key ?? "", e]));
  const seen = new Set<string>();
  const results: RowResult[] = parsed.map(({ row, result, raw }) => {
    if (!result.success) {
      const key = typeof raw.key === "string" ? raw.key : "";
      return {
        row,
        key,
        action: "error",
        errors: result.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`),
      };
    }
    const r = result.data;
    if (seen.has(r.key)) return { row, key: r.key, action: "error", errors: ["key: appears twice in this file"] };
    seen.add(r.key);
    const found = byKey.get(r.key);
    if (!found) return { row, key: r.key, action: "create", errors: [] };
    const next = profileValues(r, opts.sample ?? false);
    const same =
      found.org.legalName === r.legal_name &&
      found.org.kind === r.kind &&
      (found.org.state ?? null) === (r.state ?? null) &&
      JSON.stringify(Object.keys(next).map((k) => [k, (found.profile as Record<string, unknown>)[k] ?? null])) ===
        JSON.stringify(Object.entries(next));
    return { row, key: r.key, action: same ? "unchanged" : "update", errors: [] };
  });
  const report = summarise("companies", false, results);
  if (!opts.apply || report.counts.error > 0) return report;

  await db.transaction(async (tx) => {
    // Search (step 5.2): every profile written here reaches the companies index through the outbox.
    const changed: string[] = [];
    for (const { result } of parsed) {
      if (!result.success) continue;
      const r = result.data;
      const outcome = results.find((x) => x.key === r.key);
      if (outcome?.action === "unchanged") continue;
      const found = byKey.get(r.key);
      const values = profileValues(r, opts.sample ?? false);
      if (found) {
        await tx
          .update(o)
          .set({ legalName: r.legal_name, kind: r.kind, state: r.state ?? null })
          .where(eq(o.id, found.organisationId));
        await tx.update(p).set(values).where(eq(p.organisationId, found.organisationId));
        changed.push(found.organisationId);
      } else {
        const [org] = await tx
          .insert(o)
          .values({ legalName: r.legal_name, kind: r.kind, state: r.state ?? null })
          .returning({ id: o.id });
        if (!org) throw new Error("organisation insert returned nothing");
        const base = slugifyCompany(values.tradeName) || r.key;
        const taken = new Set(
          (await tx.select({ slug: p.slug }).from(p))
            .map((x) => x.slug)
            .filter((s) => s === base || s.startsWith(`${base}-`)),
        );
        let slug = base;
        for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${String(n)}`;
        await tx
          .insert(p)
          .values({ organisationId: org.id, slug, importKey: r.key, claimStatus: "Unclaimed", ...values });
        changed.push(org.id);
      }
    }
    await queueIndexChange(tx, "companies", changed);
    // Product documents carry the supplier's name and state.
    await queueProductsOf(tx, { organisationIds: changed });
    await audit(tx, {
      actorId: null,
      action: "companies.import",
      resourceType: "company_profiles",
      resourceId: null,
      after: { created: report.counts.create, updated: report.counts.update, sample: opts.sample ?? false },
    });
  });
  await nudgeIndexer();
  return summarise("companies", true, results);
}
