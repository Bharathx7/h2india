import { listOf, summarise, yesNo, type ImportReport, type RowResult } from "@h2india/core/importing";
import { convertMarkdownToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  ValidationError,
  type FlattenedField,
  type Payload,
  type PayloadRequest,
} from "payload";
import { slugify } from "../slug";
import { CONTENT_TYPES, CONTROL_COLUMNS, type ContentTypeName } from "./types";
import { convertCell, sameValue } from "./values";

// The content importer (step 4.6). Each row is mapped onto the collection's own fields and saved by Payload, so it
// meets exactly the rules editors meet. A check (the default, A41) saves every row inside a transaction that is
// rolled back; --apply writes only when no row has a problem. Rows are matched on `slug`, so importing the same file
// again updates or skips instead of duplicating. New rows are drafts unless publish=yes is allowed (A39).

type Row = Record<string, unknown>;
type Doc = Record<string, unknown> & { id: number | string; _status?: string };

interface Mapped {
  key: string;
  data: Record<string, unknown>;
  publish: boolean;
  errors: string[];
}

function columnsOf(fields: FlattenedField[], prefix = ""): Map<string, FlattenedField> {
  const out = new Map<string, FlattenedField>();
  for (const f of fields) {
    if (!("name" in f) || f.name.startsWith("_") || f.name === "id" || f.type === "join") continue;
    if (f.type === "group" && "flattenedFields" in f) {
      for (const [k, v] of columnsOf(f.flattenedFields, `${prefix}${f.name}.`)) out.set(k, v);
      out.set(`${prefix}${f.name}`, f);
    } else out.set(`${prefix}${f.name}`, f);
  }
  return out;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let node = target;
  for (const p of parts.slice(0, -1)) {
    const next = node[p];
    node = (node[p] = next && typeof next === "object" ? next : {}) as Record<string, unknown>;
  }
  node[parts.at(-1) ?? path] = value;
}

/** JSON rows may nest groups ({"source": {"name": …}}); CSV uses dotted columns (source.name). Both end up dotted. */
function flattenRow(row: Row, columns: Map<string, FlattenedField>, prefix = ""): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    const path = `${prefix}${k}`;
    const field = columns.get(path);
    if (field?.type === "group" && v && typeof v === "object" && !Array.isArray(v))
      Object.assign(out, flattenRow(v as Row, columns, `${path}.`));
    else out[path] = v;
  }
  return out;
}

async function lookupIds(payload: Payload, collection: string, keys: string[]): Promise<Map<string, number | string>> {
  const field = collection === "editors" ? "email" : collection === "media" ? "filename" : "slug";
  const res = await payload.find({
    collection: collection as "authors",
    where: { [field]: { in: keys } },
    limit: keys.length,
    depth: 0,
    draft: true,
    pagination: false,
    overrideAccess: true,
  });
  return new Map(res.docs.map((d) => [String((d as unknown as Row)[field]), d.id]));
}

async function mapRow(
  payload: Payload,
  type: ContentTypeName,
  columns: Map<string, FlattenedField>,
  raw: Row,
): Promise<Mapped> {
  const spec = CONTENT_TYPES[type];
  const row = flattenRow(raw, columns);
  const errors: string[] = [];
  const data: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    if ((CONTROL_COLUMNS as readonly string[]).includes(column)) continue;
    const field = columns.get(column);
    if (!field) {
      errors.push(`${column}: not a field of ${type}`);
      continue;
    }
    if (field.type === "relationship") {
      if (Array.isArray(field.relationTo)) {
        errors.push(`${column}: links to several kinds of item; fill it in /cms`);
        continue;
      }
      const keys = listOf(typeof value === "number" ? String(value) : value);
      const ids = keys.length ? await lookupIds(payload, field.relationTo, keys) : new Map<string, number | string>();
      const missing = keys.filter((k) => !ids.has(k));
      if (missing.length) errors.push(`${column}: no ${field.relationTo} with ${missing.join(", ")}`);
      const found: (number | string)[] = keys.flatMap((k) => {
        const id = ids.get(k);
        return id === undefined ? [] : [id];
      });
      setPath(data, column, field.hasMany ? found : (found[0] ?? null));
      continue;
    }
    if (field.type === "richText") {
      const markdown = typeof value === "string" ? value : "";
      if (!markdown.trim()) {
        setPath(data, column, null);
        continue;
      }
      const editorConfig = editorConfigFactory.fromField({ field });
      setPath(data, column, convertMarkdownToLexical({ editorConfig, markdown }));
      continue;
    }
    const converted = convertCell(field.type, "hasMany" in field && field.hasMany === true, value);
    if ("error" in converted) errors.push(`${column}: ${converted.error}`);
    else setPath(data, column, converted.value);
  }
  const given = typeof row.slug === "string" ? row.slug.trim() : "";
  const title = data[spec.titleField];
  const key = given ? slugify(given) : typeof title === "string" ? slugify(title) : "";
  if (!key) errors.push(`slug: give a slug or a ${spec.titleField}`);
  data.slug = key;
  const publishCell = yesNo(row.publish);
  if (publishCell === null) errors.push("publish: yes or no");
  const publish = publishCell === true;
  if (publish && !spec.publishable)
    errors.push("publish: articles always import as drafts for the Editor-in-chief (A39)");
  return { key, data, publish, errors };
}

function messagesOf(error: unknown): string[] {
  if (error instanceof ValidationError) {
    const list = (error.data as { errors?: { path?: string; message: string }[] } | undefined)?.errors ?? [];
    return list.length ? list.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)) : [error.message];
  }
  return [error instanceof Error ? error.message : String(error)];
}

async function inTransaction<T>(payload: Payload, keep: boolean, run: (req: PayloadRequest) => Promise<T>): Promise<T> {
  const req = await createLocalReq({ context: { importing: true } }, payload);
  await initTransaction(req);
  try {
    const out = await run(req);
    if (keep) await commitTransaction(req);
    else await killTransaction(req);
    return out;
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}

export async function importContent(
  payload: Payload,
  type: ContentTypeName,
  rows: Row[],
  opts: { apply: boolean; firstRow: number; sample?: boolean },
): Promise<ImportReport> {
  const spec = CONTENT_TYPES[type];
  const columns = columnsOf(payload.collections[spec.collection].config.flattenedFields);
  const results: RowResult[] = [];
  const plans: { mapped: Mapped; existing: Doc | null; row: number }[] = [];
  const seen = new Set<string>();

  for (const [i, raw] of rows.entries()) {
    const row = opts.firstRow + i;
    const mapped = await mapRow(payload, type, columns, raw);
    if (opts.sample) mapped.data.sample = true;
    if (mapped.key && seen.has(mapped.key)) mapped.errors.push("slug: appears twice in this file");
    seen.add(mapped.key);
    const found = mapped.key
      ? await payload.find({
          collection: spec.collection,
          where: { slug: { equals: mapped.key } },
          draft: true,
          depth: 0,
          limit: 1,
          overrideAccess: true,
        })
      : null;
    const existing = (found?.docs[0] as Doc | undefined) ?? null;
    if (mapped.errors.length === 0) {
      const unchanged =
        existing !== null &&
        Object.keys(mapped.data).every((k) => sameValue(mapped.data[k], existing[k])) &&
        (!mapped.publish || existing._status === "published");
      if (unchanged) {
        results.push({ row, key: mapped.key, action: "unchanged", errors: [] });
        continue;
      }
      // Saved exactly as it will be, then rolled back: every field rule and hook runs.
      try {
        await inTransaction(payload, false, (req) => save(payload, spec.collection, mapped, existing, req, true));
      } catch (error) {
        mapped.errors.push(...messagesOf(error));
      }
    }
    results.push({
      row,
      key: mapped.key,
      action: mapped.errors.length ? "error" : existing ? "update" : "create",
      errors: mapped.errors,
    });
    if (!mapped.errors.length) plans.push({ mapped, existing, row });
  }

  const report = summarise(type, false, results);
  if (!opts.apply || report.counts.error > 0) return report;
  for (const plan of plans) {
    await inTransaction(payload, true, (req) => save(payload, spec.collection, plan.mapped, plan.existing, req, false));
  }
  return summarise(type, true, results);
}

/** New rows are created as drafts (or published); an existing published item keeps its live version and gains a draft. */
async function save(
  payload: Payload,
  collection: (typeof CONTENT_TYPES)[ContentTypeName]["collection"],
  mapped: Mapped,
  existing: Doc | null,
  req: PayloadRequest,
  checking: boolean,
) {
  const _status = mapped.publish ? "published" : "draft";
  const data = { ...mapped.data, _status } as never;
  if (!existing) return payload.create({ collection, data, draft: false, req, overrideAccess: true });
  // A check validates fully (draft: false); writing an unpublished change to a live item keeps the live version.
  const asDraft = !checking && !mapped.publish && existing._status === "published";
  return payload.update({ collection, id: existing.id, data, draft: asDraft, req, overrideAccess: true });
}
