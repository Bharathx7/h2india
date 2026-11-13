import type { Payload, Where } from "payload";
import { describeFields, relationsOf, type FieldSpec } from "./fields";
import { CONTENT_SLUGS, SETTING_SLUGS } from "./registry";
import type { cmsSession } from "./session";

// Reads for the native content screens (step 4.6). Every read runs as the signed-in editor, so the CMS access rules
// decide what they see (drafts only for editors, private files only for those allowed).

type Cms = NonNullable<Awaited<ReturnType<typeof cmsSession>>>;

export interface ContentType {
  slug: string;
  singular: string;
  plural: string;
  titleField: string;
  drafts: boolean;
  upload: boolean;
  fields: FieldSpec[];
}

const label = (v: unknown, fallback: string) =>
  typeof v === "string" ? v : v && typeof v === "object" && "en" in v ? String(v.en) : fallback;

export function contentType(payload: Payload, slug: string): ContentType | null {
  if (!CONTENT_SLUGS.includes(slug)) return null;
  const c = (payload.collections as unknown as Record<string, { config: Record<string, unknown> } | undefined>)[slug]
    ?.config;
  if (!c) return null;
  const labels = (c.labels ?? {}) as { singular?: unknown; plural?: unknown };
  const admin = (c.admin ?? {}) as { useAsTitle?: string };
  const versions = c.versions as { drafts?: unknown } | false | undefined;
  return {
    slug,
    singular: label(labels.singular, slug),
    plural: label(labels.plural, slug),
    titleField: admin.useAsTitle ?? "id",
    drafts: Boolean(versions && versions.drafts),
    upload: Boolean(c.upload),
    fields: describeFields(c.fields as unknown[]),
  };
}

export function settingType(
  payload: Payload,
  slug: string,
): Omit<ContentType, "titleField" | "upload" | "plural"> | null {
  if (!SETTING_SLUGS.includes(slug)) return null;
  const g = payload.globals.config.find((x) => x.slug === slug);
  if (!g) return null;
  const versions = g.versions as { drafts?: unknown } | false | undefined;
  return {
    slug,
    singular: label(g.label, slug),
    drafts: Boolean(versions && versions.drafts),
    fields: describeFields(g.fields),
  };
}

export interface RecordRow {
  id: number;
  title: string;
  status: string | null;
  published: boolean | null;
  updatedAt: string;
  verifiedAt: string | null;
  sample: boolean;
  thumbnail: string | null;
  /** Media: "Image · 2400 × 1600 · Hydrotek Systems" (649:8). */
  detail: string | null;
}

export async function listRecords(
  cms: Cms,
  type: ContentType,
  opts: { q?: string; page?: number },
): Promise<{ rows: RecordRow[]; total: number; pages: number; page: number }> {
  const where: Where | undefined =
    opts.q && type.titleField !== "id" ? { [type.titleField]: { like: opts.q } } : undefined;
  const res = await cms.payload.find({
    collection: type.slug as "schemes",
    draft: type.drafts,
    depth: 0,
    limit: 50,
    page: opts.page ?? 1,
    sort: "-updatedAt",
    user: cms.user,
    overrideAccess: false,
    ...(where ? { where } : {}),
  });
  return {
    rows: res.docs.map((raw) => {
      const d = raw as unknown as Record<string, unknown>;
      const ver = d.verification as { at?: string | null } | undefined;
      return {
        id: d.id as number,
        title:
          [d[type.titleField], d.filename]
            .find((x): x is string | number => typeof x === "string" || typeof x === "number")
            ?.toString() ?? `#${String(d.id)}`,
        status: typeof d.status === "string" ? d.status : null,
        published: type.drafts ? d._status === "published" : null,
        updatedAt: String(d.updatedAt),
        verifiedAt: ver?.at ?? null,
        sample: d.sample === true,
        detail:
          typeof d.mimeType === "string"
            ? [
                d.mimeType.startsWith("image/") ? "Image" : d.mimeType === "application/pdf" ? "PDF" : "File",
                typeof d.width === "number" && typeof d.height === "number"
                  ? `${String(d.width)} × ${String(d.height)}`
                  : null,
                typeof d.credit === "string" && d.credit ? d.credit : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : null,
        thumbnail:
          typeof d.thumbnailURL === "string"
            ? d.thumbnailURL
            : typeof d.url === "string" && typeof d.mimeType === "string" && d.mimeType.startsWith("image/")
              ? d.url
              : null,
      };
    }),
    total: res.totalDocs,
    pages: res.totalPages,
    page: res.page ?? 1,
  };
}

export async function recordValues(cms: Cms, type: ContentType, id: number) {
  const doc = await cms.payload
    .findByID({
      collection: type.slug as "schemes",
      id,
      draft: type.drafts,
      depth: 0,
      user: cms.user,
      overrideAccess: false,
    })
    .catch(() => null);
  return doc as unknown as (Record<string, unknown> & { id: number; updatedAt: string; _status?: string }) | null;
}

export interface Choice {
  id: number;
  label: string;
}

/** The choices for every relationship and upload field in a form. */
export async function choicesFor(cms: Cms, fields: FieldSpec[]): Promise<Record<string, Choice[]>> {
  const out: Record<string, Choice[]> = {};
  await Promise.all(
    relationsOf(fields).map(async (slug) => {
      const c = (
        cms.payload.collections as Record<string, { config: { admin?: { useAsTitle?: string } } } | undefined>
      )[slug]?.config;
      if (!c) return;
      const title = c.admin?.useAsTitle ?? "id";
      const res = await cms.payload
        .find({
          collection: slug as "schemes",
          limit: 500,
          depth: 0,
          sort: title === "id" ? "-createdAt" : title,
          user: cms.user,
          overrideAccess: false,
        })
        .catch(() => null);
      out[slug] = (res?.docs ?? []).map((raw) => {
        const d = raw as unknown as Record<string, unknown>;
        return { id: d.id as number, label: String(d[title] ?? d.filename ?? d.id) };
      });
    }),
  );
  return out;
}
