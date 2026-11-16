import { schema, type Database, type Executor } from "@h2india/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { datasheetReader } from "../adapters/datasheet";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { can } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import { checkAttributeValues, type AttributeDef } from "../catalogue/attributes";
import { effectiveSchema } from "../catalogue/taxonomy";
import { attachFile } from "../files/files";
import { enqueue, QUEUES } from "../queue/queues";
import { defineSetting, getSetting } from "../settings";
import { ProductError, saveProduct } from "./editor";

// The datasheet reader (step 8.4; Datasheet review 610:8). A supplier uploads a PDF and picks the category; the worker
// (never the browser) asks the engine to read it; each field gets a confidence from the thresholds; the supplier
// accepts, edits or marks "Not in datasheet"; nothing reaches buyers until H2 Economy approves the resulting listing.
// Values outside an attribute's allowed range are flagged and never saved as read (a misread pressure is a safety
// issue). The engine, its version and the region are recorded per extraction.

const x = schema.datasheetExtractions;

/** M8 (OPEN): High at or above `high`, Medium at or above `medium`, else Low. */
export const DATASHEET_THRESHOLDS = defineSetting<{ high: number; medium: number }>({
  key: "datasheet.thresholds",
  description:
    "Datasheet reader: the engine scores (0 to 1) at which a field counts as High and Medium confidence (M8)",
  schema: z.object({ high: z.number().min(0).max(1), medium: z.number().min(0).max(1) }),
  fallback: { high: 0.9, medium: 0.6 },
});

export const confidenceOf = (score: number, t: { high: number; medium: number }): "high" | "medium" | "low" =>
  score >= t.high ? "high" : score >= t.medium ? "medium" : "low";

/** Why a value can't be saved as read, using the attribute's own rules; null when it can. */
export function valueProblem(def: AttributeDef, value: unknown): string | null {
  const r = checkAttributeValues([{ ...def, required: false }], { [def.key]: value });
  return r.ok ? null : (r.errors[def.key] ?? "This value can't be used");
}

export async function startExtraction(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { fileId: string; categoryId: string; context?: RequestContext },
): Promise<{ id: string }> {
  if (!can(actor, "product.manage", { organisationId })) throw new ProductError("Not allowed");
  const [row] = await db
    .insert(x)
    .values({ organisationId, fileId: input.fileId, categoryId: input.categoryId, createdBy: actor.userId })
    .returning({ id: x.id });
  if (!row) throw new Error("extraction not saved");
  await attachFile(db, {
    actor,
    fileId: input.fileId,
    kind: "datasheet",
    attachedType: "datasheet_extraction",
    attachedId: row.id,
  });
  await audit(db, {
    actorId: actor.userId,
    action: "datasheet.uploaded",
    resourceType: "datasheet_extraction",
    resourceId: row.id,
    companyId: organisationId,
    context: input.context,
  });
  await enqueue(QUEUES.imports, "datasheet-extract", { id: row.id }, { jobId: `datasheet-${row.id}` });
  return row;
}

/** The worker's job: read the datasheet through the engine and store the fields. Safe to retry. */
export async function runExtraction(db: Database, id: string): Promise<"done" | "skipped"> {
  const [row] = await db.select().from(x).where(eq(x.id, id));
  if (!row || (row.status !== "Queued" && row.status !== "Reading")) return "skipped";
  await db.update(x).set({ status: "Reading", updatedAt: new Date() }).where(eq(x.id, id));
  const defs = await effectiveSchema(db, row.categoryId, { includeSample: true });
  const thresholds = await getSetting(db, DATASHEET_THRESHOLDS);
  try {
    const out = await datasheetReader().extract({
      fileId: row.fileId,
      categoryId: row.categoryId,
      attributes: defs.map((d) => ({ key: d.key, label: d.label, type: d.type, unit: d.unit })),
    });
    const fields = out.fields.map((f) => {
      const def = defs.find((d) => d.key === f.attributeKey);
      const value = def?.type === "boolean" && typeof f.value === "string" ? f.value.toLowerCase() === "yes" : f.value;
      const problem = def ? valueProblem(def, value) : null;
      return {
        ...f,
        value: value as typeof f.value,
        confidence: confidenceOf(f.score, thresholds),
        ...(problem ? { problem } : {}),
      };
    });
    await db
      .update(x)
      .set({
        status: "Ready",
        fields,
        engine: out.engine,
        engineVersion: out.version,
        region: out.region,
        updatedAt: new Date(),
      })
      .where(eq(x.id, id));
    await audit(db, {
      actorId: null,
      action: "datasheet.read",
      resourceType: "datasheet_extraction",
      resourceId: id,
      companyId: row.organisationId,
      after: { engine: out.engine, version: out.version, region: out.region, fields: fields.length },
    });
    return "done";
  } catch (error) {
    await db
      .update(x)
      .set({
        status: "Failed",
        error: error instanceof Error ? error.message.slice(0, 300) : "failed",
        updatedAt: new Date(),
      })
      .where(eq(x.id, id));
    throw error;
  }
}

export async function getExtraction(db: Executor, scope: Scope, organisationId: string, id: string) {
  const [row] = await db
    .select()
    .from(x)
    .where(and(inScope(scope, x.organisationId), eq(x.organisationId, organisationId), eq(x.id, id)));
  return row ?? null;
}

export async function listExtractions(db: Executor, scope: Scope, organisationId: string) {
  return db
    .select()
    .from(x)
    .where(and(inScope(scope, x.organisationId), eq(x.organisationId, organisationId)))
    .orderBy(desc(x.createdAt))
    .limit(20);
}

/** The fields that still need the supplier: Medium and Low ones, and any that can't be saved as read. */
export function fieldsToCheck(
  fields: { attributeKey: string; confidence: string; problem?: string }[],
  decisions: Record<string, { state: string }>,
) {
  return fields.filter((f) => (f.confidence !== "high" || f.problem) && !decisions[f.attributeKey]);
}

/** Accept, edit (checked against the attribute) or mark Not in datasheet (610:8). */
export async function decideField(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { id: string; key: string; state: "accepted" | "edited" | "absent"; value?: unknown },
) {
  if (!can(actor, "product.manage", { organisationId })) throw new ProductError("Not allowed");
  const [row] = await db
    .select()
    .from(x)
    .where(and(eq(x.id, input.id), eq(x.organisationId, organisationId)));
  if (!row || row.status !== "Ready") throw new ProductError("This datasheet can't be changed now");
  const field = row.fields.find((f) => f.attributeKey === input.key);
  if (input.state === "accepted" && field?.problem)
    throw new ProductError(`${field.problem}. Edit the value or mark it not in the datasheet.`);
  if (input.state === "edited") {
    const defs = await effectiveSchema(db, row.categoryId, { includeSample: true });
    const def = defs.find((d) => d.key === input.key);
    const problem = def ? valueProblem(def, input.value) : null;
    if (problem) throw new ProductError(problem, { [input.key]: problem });
  }
  await db
    .update(x)
    .set({
      decisions: { ...row.decisions, [input.key]: { state: input.state, value: input.value } },
      updatedAt: new Date(),
    })
    .where(eq(x.id, row.id));
}

/**
 * Submit for review (610:8): a draft listing with the checked values goes to the Listings queue as "from datasheet".
 * Disabled until every Medium and Low field is accepted, edited or marked not in the datasheet.
 */
export async function submitExtraction(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: { id: string; name: string; model?: string; context?: RequestContext },
): Promise<{ productId: string; status: string }> {
  const [row] = await db
    .select()
    .from(x)
    .where(and(eq(x.id, input.id), eq(x.organisationId, organisationId)));
  if (!row || row.status !== "Ready") throw new ProductError("This datasheet has already been sent");
  const open = fieldsToCheck(row.fields, row.decisions);
  if (open.length)
    throw new ProductError(`Check ${String(open.length)} more ${open.length === 1 ? "field" : "fields"} first`);
  const attributes: Record<string, unknown> = {};
  let edited = 0;
  for (const f of row.fields) {
    if (f.attributeKey === "name" || f.attributeKey === "model") continue;
    const d = row.decisions[f.attributeKey];
    if (d?.state === "absent") continue;
    if (d?.state === "edited") {
      attributes[f.attributeKey] = d.value;
      edited += 1;
    } else if (!f.problem) attributes[f.attributeKey] = f.value;
  }
  const [file] = await db.select({ name: schema.files.name }).from(schema.files).where(eq(schema.files.id, row.fileId));
  const data = {
    categoryId: row.categoryId,
    name: input.name,
    model: input.model ?? null,
    attributes,
    pricing: "quote" as const,
    documents: [{ label: file?.name ?? "Datasheet", fileId: row.fileId }],
  };
  const check = {
    key: "datasheet",
    ok: true,
    label: "Datasheet matches the submitted values",
    detail: `${file?.name ?? "datasheet"} · ${String(row.fields.length)} fields read${edited ? `, ${String(edited)} edited by the supplier` : ""}`,
  };
  // Straight to review when the listing is complete; otherwise a draft that opens in the editor for commercial terms.
  // Either way the queue shows it as "from datasheet" (the extraction is linked to the product).
  const saved = await saveProduct(db, actor, organisationId, { data, submit: false, context: input.context });
  await db.update(x).set({ status: "Submitted", productId: saved.id, updatedAt: new Date() }).where(eq(x.id, row.id));
  let status = saved.status;
  try {
    status = (
      await saveProduct(db, actor, organisationId, {
        id: saved.id,
        data: {},
        submit: true,
        kind: "from datasheet",
        extraChecks: [check],
        context: input.context,
      })
    ).status;
  } catch (error) {
    if (!(error instanceof ProductError)) throw error;
  }
  await audit(db, {
    actorId: actor.userId,
    action: "datasheet.submitted",
    resourceType: "datasheet_extraction",
    resourceId: row.id,
    companyId: organisationId,
    after: { productId: saved.id, edited, fields: row.fields.length },
    context: input.context,
  });
  return { productId: saved.id, status };
}
