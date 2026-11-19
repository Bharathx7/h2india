import type { Payload } from "payload";
import { purgeBlocker, purgeRule, uploadsIn, type PurgeFacts } from "@/cms/purge-rules";

// What Delete permanently needs to know about a record (A197): is it archived, published, ever published, and how many
// records still link to it. Read with the Local API (never SQL on the cms schema), trashed records included, so an
// archived record that still uses a picture keeps it.

type Raw = {
  name?: string;
  type?: string;
  relationTo?: string | string[];
  fields?: Raw[];
  tabs?: (Raw & { name?: string })[];
};

/** Where a collection's fields point at `target`: relationship/upload paths, and rich-text paths that can hold it. */
function pathsTo(fields: Raw[], target: string, prefix = ""): { links: string[]; rich: string[] } {
  const links: string[] = [];
  const rich: string[] = [];
  for (const f of fields) {
    const here = f.name ? `${prefix}${f.name}` : prefix.replace(/\.$/, "");
    if ((f.type === "relationship" || f.type === "upload") && f.relationTo === target && f.name) links.push(here);
    else if (f.type === "richText" && f.name) rich.push(here);
    else if ((f.type === "group" || f.type === "array") && f.fields) {
      const inner = pathsTo(f.fields, target, f.name ? `${here}.` : prefix);
      links.push(...inner.links);
      rich.push(...inner.rich);
    } else if ((f.type === "row" || f.type === "collapsible") && f.fields) {
      const inner = pathsTo(f.fields, target, prefix);
      links.push(...inner.links);
      rich.push(...inner.rich);
    } else if (f.type === "tabs" && f.tabs) {
      for (const t of f.tabs) {
        const inner = pathsTo(t.fields ?? [], target, t.name ? `${prefix}${t.name}.` : prefix);
        links.push(...inner.links);
        rich.push(...inner.rich);
      }
    }
  }
  return { links, rich };
}

const at = (doc: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((v, k) => {
    if (Array.isArray(v)) return v.map((x) => (x as Record<string, unknown> | null)?.[k]);
    return v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
  }, doc);

/** How many records (in any collection, archived ones included) and settings link to this record. */
export async function usageCount(payload: Payload, slug: string, id: number): Promise<number> {
  let total = 0;
  const uploadable = slug === "media" || slug === "media-files" || slug === "report-files";
  for (const c of Object.values(payload.collections)) {
    const config = c.config as unknown as { slug: string; fields: Raw[]; trash?: boolean };
    if (config.slug.startsWith("payload-")) continue;
    const { links, rich } = pathsTo(config.fields, slug);
    for (const path of links) {
      const res = await payload.count({
        collection: config.slug as "articles",
        where: { [path]: { in: [id] } },
        trash: Boolean(config.trash),
        overrideAccess: true,
      });
      total += res.totalDocs;
    }
    // Pictures and files placed inside text: read the text fields page by page and look for the upload node.
    if (uploadable && rich.length) {
      const select = Object.fromEntries(rich.map((p) => [p.split(".")[0] as string, true]));
      for (let page = 1; ; page += 1) {
        const res = await payload.find({
          collection: config.slug as "articles",
          select: select as never,
          depth: 0,
          limit: 100,
          page,
          trash: Boolean(config.trash),
          draft: true,
          overrideAccess: true,
        });
        total += res.docs.filter((d) => rich.some((p) => uploadsIn(at(d, p), slug).includes(id))).length;
        if (!res.hasNextPage) break;
      }
    }
  }
  for (const g of payload.globals.config) {
    const { links, rich } = pathsTo(g.fields, slug);
    if (!links.length && !(uploadable && rich.length)) continue;
    const doc = await payload.findGlobal({ slug: g.slug as "pricing", depth: 0, draft: true, overrideAccess: true });
    const hit =
      links.some((p) => {
        const v = at(doc, p);
        const list: unknown[] = Array.isArray(v) ? (v as unknown[]).flat(3) : [v];
        const ids = list.map((x): unknown => (x && typeof x === "object" ? (x as { id?: unknown }).id : x));
        return ids.includes(id);
      }) ||
      (uploadable && rich.some((p) => uploadsIn(at(doc, p), slug).includes(id)));
    if (hit) total += 1;
  }
  return total;
}

/** The facts the rule needs, and the record's name for the confirmation; null when it doesn't exist. */
export async function purgeCheck(
  payload: Payload,
  slug: string,
  id: number,
): Promise<{ name: string; facts: PurgeFacts; blocker: string | null; snapshot: Record<string, unknown> } | null> {
  const rule = purgeRule(slug);
  const config = (payload.collections as Record<string, { config: unknown } | undefined>)[slug]?.config as
    { trash?: boolean; versions?: { drafts?: unknown } | false; admin?: { useAsTitle?: string } } | undefined;
  if (!config) return null;
  const doc = (await payload
    .findByID({
      collection: slug as "articles",
      id,
      depth: 0,
      draft: true,
      trash: Boolean(config.trash),
      overrideAccess: true,
    })
    .catch(() => null)) as Record<string, unknown> | null;
  if (!doc) return null;
  const drafts = Boolean(config.versions && config.versions.drafts);
  const titleField = slug === "articles" ? "title" : (config.admin?.useAsTitle ?? "id");
  const name = String(doc[titleField] ?? doc.filename ?? doc.id);
  let published = drafts ? false : true;
  let everPublished = published;
  if (drafts) {
    const live = await payload
      .findByID({ collection: slug as "articles", id, depth: 0, draft: false, trash: true, overrideAccess: true })
      .catch(() => null);
    published = (live as { _status?: string } | null)?._status === "published";
    const versions = await payload.countVersions({
      collection: slug as "articles",
      where: { and: [{ parent: { equals: id } }, { "version._status": { equals: "published" } }] },
      overrideAccess: true,
    });
    everPublished = published || versions.totalDocs > 0;
  }
  const facts: PurgeFacts = {
    archived: Boolean(doc.deletedAt),
    published,
    everPublished,
    usedBy: rule === "unused" ? await usageCount(payload, slug, id) : 0,
  };
  // What the audit log keeps of it: the name and the plain fields, not the long text.
  const snapshot = Object.fromEntries(
    Object.entries(doc).filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v)),
  );
  return { name, facts, blocker: purgeBlocker(rule, facts), snapshot };
}
