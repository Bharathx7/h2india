import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Money } from "../money";
import { audit, type RequestContext } from "../audit";
import { loadActor, type Actor } from "../authz/actor";
import { can } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import type { AttributeDef } from "../catalogue/attributes";
import { effectiveSchema } from "../catalogue/taxonomy";
import { attachFile } from "../files/files";
import { readObject } from "../files/storage";
import { parseCsv } from "../importing/csv";
import { enqueue, QUEUES } from "../queue/queues";
import { ProductError, saveProduct, submissionProblems, type ProductInput } from "./editor";

// Bulk upload (step 8.5; Import products 272:4427, history 607:9). The template is made from the category's schema;
// the worker checks every row with that schema and reports problems by row and column; valid rows become drafts
// (never live listings), matched on the supplier's own SKU so importing the corrected file again creates no
// duplicates. Quick stock and price (722:12379) is here too.

const im = schema.productImports;
const p = schema.products;

export const MAX_IMPORT_ROWS = 500;

/** The fixed columns, then one per attribute: "outlet_pressure (bar) *". A * marks required columns (607:9). */
const BASE_COLUMNS = [
  { key: "sku", required: true },
  { key: "name", required: true },
  { key: "model", required: false },
  { key: "summary", required: false },
  { key: "pricing", required: false, hint: "quote, fixed or indicative" },
  { key: "price_inr", required: false },
  { key: "gst_percent", required: false },
  { key: "lead_time_min_weeks", required: false },
  { key: "lead_time_max_weeks", required: false },
  { key: "min_order", required: false },
  { key: "stock", required: false, hint: "made_to_order or in_stock" },
  { key: "stock_qty", required: false },
  { key: "made_in_india", required: false, hint: "yes or no" },
] as const;

export function templateCsv(defs: readonly AttributeDef[]): string {
  const head = [
    ...BASE_COLUMNS.map((c) => `${c.key}${c.required ? " *" : ""}`),
    ...defs.map((d) => `${d.key}${d.unit ? ` (${d.unit})` : ""}${d.required ? " *" : ""}`),
  ];
  const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return `${head.map(quote).join(",")}\n`;
}

/** "outlet_pressure (bar) *" → "outlet_pressure" */
const columnKey = (header: string) =>
  header
    .replace(/\*/g, "")
    .replace(/\(.*\)/, "")
    .trim()
    .toLowerCase();

/** A cell as the attribute's value, or a message that says what to type. */
export function cellValue(def: AttributeDef, raw: string): { value?: unknown; error?: string } {
  const text = raw.trim();
  if (!text) return {};
  switch (def.type) {
    case "number": {
      const n = Number(text.replace(/,/g, ""));
      if (!Number.isFinite(n)) {
        const digits = /[\d.]+/.exec(text)?.[0];
        return {
          error: `"${text}" isn't a number.${digits ? ` Enter ${digits}${def.unit ? " and put the unit in its own column" : ""}.` : ""}`,
        };
      }
      return { value: n };
    }
    case "range": {
      const [a, b] = text.split(/–|-|to/).map((t) => Number(t.trim().replace(/,/g, "")));
      if (a === undefined || !Number.isFinite(a) || (b !== undefined && !Number.isFinite(b)))
        return { error: `"${text}" isn't a range. Enter it like 20-30.` };
      return { value: { min: a, max: b ?? a } };
    }
    case "boolean":
      if (/^(yes|y|true)$/i.test(text)) return { value: true };
      if (/^(no|n|false)$/i.test(text)) return { value: false };
      return { error: `Use yes or no` };
    case "choice": {
      const match = def.options.find((o) => o.toLowerCase() === text.toLowerCase());
      return match ? { value: match } : { error: `use one of the allowed values, ${def.options.join(" or ")}` };
    }
    default:
      return { value: text };
  }
}

export interface ParsedRow {
  row: number;
  sku: string;
  data: ProductInput;
  errors: { column: string; message: string }[];
}

/** Checks a file's rows against the template. Pure: unit-tested. Row numbers count the header as row 1. */
export function parseImport(text: string, defs: readonly AttributeDef[]): { rows: ParsedRow[]; fileError?: string } {
  const records = parseCsv(text);
  if (!records.length) return { rows: [], fileError: "The file has no rows" };
  const headers = Object.keys(records[0] ?? {});
  const keys = new Map(headers.map((h) => [columnKey(h), h]));
  const known = new Set<string>([...BASE_COLUMNS.map((c) => c.key), ...defs.map((d) => d.key)]);
  const unknown = [...keys.keys()].filter((k) => k && !known.has(k));
  if (!keys.has("sku") || !keys.has("name") || unknown.length)
    return { rows: [], fileError: "Columns don't match the template" };
  if (records.length > MAX_IMPORT_ROWS)
    return { rows: [], fileError: `Up to ${String(MAX_IMPORT_ROWS)} rows in one file` };
  const cell = (r: Record<string, string>, key: string) => (keys.has(key) ? (r[keys.get(key) ?? ""] ?? "").trim() : "");
  const seen = new Set<string>();
  return {
    rows: records.map((r, i) => {
      const errors: { column: string; message: string }[] = [];
      const sku = cell(r, "sku");
      if (!sku) errors.push({ column: "sku", message: "Add your SKU so the row can be matched next time" });
      else if (seen.has(sku)) errors.push({ column: "sku", message: "This SKU is already in the file" });
      seen.add(sku);
      const attributes: Record<string, unknown> = {};
      for (const d of defs) {
        const v = cellValue(d, cell(r, d.key));
        if (v.error) errors.push({ column: d.key, message: `${d.label}: ${v.error}` });
        else if (v.value !== undefined) attributes[d.key] = v.value;
      }
      const pricing = (cell(r, "pricing") || "quote").toLowerCase();
      if (!["quote", "fixed", "indicative"].includes(pricing))
        errors.push({ column: "pricing", message: "Pricing: use quote, fixed or indicative" });
      const money = (key: string) => {
        const t = cell(r, key);
        if (!t) return null;
        try {
          return Money.parse(t);
        } catch {
          errors.push({ column: key, message: `"${t}" isn't an amount in rupees` });
          return null;
        }
      };
      const int = (key: string) => {
        const t = cell(r, key);
        if (!t) return null;
        const n = Number(t);
        if (!Number.isInteger(n) || n < 0) {
          errors.push({ column: key, message: `"${t}" isn't a whole number` });
          return null;
        }
        return n;
      };
      const stock = (cell(r, "stock") || "made_to_order").toLowerCase();
      const data: ProductInput = {
        sku: sku || null,
        name: cell(r, "name"),
        model: cell(r, "model") || null,
        summary: cell(r, "summary") || null,
        attributes,
        pricing: pricing,
        pricePaise: pricing === "fixed" ? money("price_inr") : null,
        gstRateBps: cell(r, "gst_percent") ? Math.round(Number(cell(r, "gst_percent")) * 100) : null,
        leadTimeMinWeeks: int("lead_time_min_weeks"),
        leadTimeMaxWeeks: int("lead_time_max_weeks") ?? int("lead_time_min_weeks"),
        minOrder: int("min_order"),
        stock: stock === "in_stock" ? "in_stock" : "made_to_order",
        stockQty: int("stock_qty"),
        madeInIndia: /^y/i.test(cell(r, "made_in_india")),
      };
      if (!data.name) errors.push({ column: "name", message: "Add the product name" });
      if (pricing === "fixed" && !data.pricePaise)
        errors.push({ column: "price_inr", message: "A fixed-price product needs its price" });
      // The category's own rules (required specs, allowed ranges), as a submission would check them.
      for (const [field, message] of Object.entries(
        submissionProblems(defs, { ...data, categoryId: "x", leadTimeMinWeeks: data.leadTimeMinWeeks ?? 1 }),
      )) {
        if (field.startsWith("note:")) continue;
        if (!errors.some((e) => e.column === field)) errors.push({ column: field, message });
      }
      return { row: i + 2, sku, data, errors };
    }),
  };
}

export async function startImport(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { fileId: string; fileName: string; categoryId: string; context?: RequestContext },
): Promise<{ id: string }> {
  if (!can(actor, "product.manage", { organisationId })) throw new ProductError("Not allowed");
  const [row] = await db
    .insert(im)
    .values({
      organisationId,
      fileId: input.fileId,
      fileName: input.fileName,
      categoryId: input.categoryId,
      createdBy: actor.userId,
    })
    .returning({ id: im.id });
  if (!row) throw new Error("import not saved");
  await attachFile(db, {
    actor,
    fileId: input.fileId,
    kind: "product_import",
    attachedType: "product_import",
    attachedId: row.id,
  });
  await audit(db, {
    actorId: actor.userId,
    action: "products.import.started",
    resourceType: "product_import",
    resourceId: row.id,
    companyId: organisationId,
    context: input.context,
  });
  await enqueue(QUEUES.imports, "product-import", { id: row.id }, { jobId: `import-${row.id}` });
  return row;
}

/** The worker's job. Re-running it is safe: rows are matched on SKU. */
export async function runProductImport(db: Database, id: string): Promise<string> {
  const [job] = await db.select().from(im).where(eq(im.id, id));
  if (!job || job.status !== "Checking rows") return "skipped";
  const [file] = await db.select().from(schema.files).where(eq(schema.files.id, job.fileId));
  const fail = async (error: string) => {
    await db.update(im).set({ status: "File not read", error, updatedAt: new Date() }).where(eq(im.id, id));
    return "failed";
  };
  if (!file?.bucket || !file.objectKey || file.status !== "Available")
    return fail("The file wasn't uploaded completely");
  const bytes = await readObject(file.bucket, file.objectKey, 5 * 1024 * 1024);
  if (bytes === "too-large") return fail("The file is too large");
  return applyImport(db, id, new TextDecoder().decode(bytes));
}

/** Checks a file's text and saves its valid rows as drafts (the job, after reading the file). */
export async function applyImport(db: Database, id: string, text: string): Promise<string> {
  const [job] = await db.select().from(im).where(eq(im.id, id));
  if (!job || job.status !== "Checking rows") return "skipped";
  const fail = async (error: string) => {
    await db.update(im).set({ status: "File not read", error, updatedAt: new Date() }).where(eq(im.id, id));
    return "failed";
  };
  const defs = await effectiveSchema(db, job.categoryId, { includeSample: true });
  const [cat] = await db
    .select({ label: schema.catalogueCategories.label })
    .from(schema.catalogueCategories)
    .where(eq(schema.catalogueCategories.id, job.categoryId));
  const parsed = parseImport(text, defs);
  if (parsed.fileError)
    return fail(
      parsed.fileError === "Columns don't match the template"
        ? `Columns don't match the ${cat?.label ?? ""} template`
        : parsed.fileError,
    );
  const actor = await loadActor(db, job.createdBy);
  const errors = parsed.rows.flatMap((r) =>
    r.errors.map((e) => ({ row: r.row, sku: r.sku, column: e.column, message: e.message })),
  );
  let saved = 0;
  for (const r of parsed.rows.filter((x) => !x.errors.length)) {
    const [existing] = await db
      .select({ id: p.id })
      .from(p)
      .where(and(eq(p.organisationId, job.organisationId), eq(p.sku, r.sku), isNull(p.deletedAt)));
    try {
      await saveProduct(db, actor, job.organisationId, {
        id: existing?.id,
        data: { ...r.data, categoryId: job.categoryId },
        submit: false,
      });
      saved += 1;
    } catch (error) {
      if (!(error instanceof ProductError)) throw error;
      errors.push({ row: r.row, sku: r.sku, column: "", message: error.message });
    }
  }
  await db
    .update(im)
    .set({ status: "Done", rows: parsed.rows.length, saved, errors, updatedAt: new Date() })
    .where(eq(im.id, id));
  await audit(db, {
    actorId: job.createdBy,
    action: "products.import.done",
    resourceType: "product_import",
    resourceId: id,
    companyId: job.organisationId,
    after: { rows: parsed.rows.length, saved, problems: errors.length },
  });
  return "done";
}

export async function listImports(db: Executor, scope: Scope, organisationId: string) {
  return db
    .select({ i: im, by: schema.users.name, category: schema.catalogueCategories.label })
    .from(im)
    .leftJoin(schema.users, eq(schema.users.id, im.createdBy))
    .leftJoin(schema.catalogueCategories, eq(schema.catalogueCategories.id, im.categoryId))
    .where(and(inScope(scope, im.organisationId), eq(im.organisationId, organisationId)))
    .orderBy(desc(im.createdAt))
    .limit(30);
}

// ------------------------------------------------------------------------------------------------ quick stock

/** Quick stock and price (722:12379): fixed-price products only. */
export async function quickStockRows(db: Executor, scope: Scope, organisationId: string) {
  return db
    .select({
      id: p.id,
      name: p.name,
      model: p.model,
      sku: p.sku,
      pricePaise: p.pricePaise,
      gstRateBps: p.gstRateBps,
      stock: p.stock,
      stockQty: p.stockQty,
      shipDays: p.shipDays,
      categoryId: p.categoryId,
    })
    .from(p)
    .where(
      and(
        inScope(scope, p.organisationId),
        eq(p.organisationId, organisationId),
        eq(p.pricing, "fixed"),
        isNull(p.deletedAt),
      ),
    )
    .orderBy(p.name);
}

export interface QuickChange {
  id: string;
  price: string;
  stockQty: string;
  shipDays: string;
}

/** Saves the changed rows: price, stock and dispatch days go live at once (no review). Problems by product. */
export async function saveQuickStock(
  db: Database,
  actor: Actor,
  organisationId: string,
  changes: QuickChange[],
  context?: RequestContext,
) {
  // Row ids come from the browser: a Map, not an object keyed by them (CodeQL js/remote-property-injection).
  const problems = new Map<string, string>();
  const updates: { id: string; data: ProductInput }[] = [];
  for (const c of changes) {
    let price: bigint;
    try {
      price = Money.parse(c.price);
    } catch {
      problems.set(c.id, "Enter the price in rupees");
      continue;
    }
    const qty = Number(c.stockQty);
    const days = Number(c.shipDays);
    if (!(price > 0n)) problems.set(c.id, "Enter the price in rupees");
    else if (!Number.isInteger(qty) || qty < 0) problems.set(c.id, "Stock is a whole number");
    else if (!Number.isInteger(days) || days < 1) problems.set(c.id, "At least 1 day");
    else
      updates.push({
        id: c.id,
        data: { pricing: "fixed", pricePaise: price, stock: "in_stock", stockQty: qty, shipDays: days },
      });
  }
  if (problems.size) throw new ProductError("Fix the highlighted rows", Object.fromEntries(problems));
  for (const u of updates)
    await saveProduct(db, actor, organisationId, { id: u.id, data: u.data, submit: false, context });
  return updates.length;
}
