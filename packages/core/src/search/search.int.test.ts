import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { importCompanies } from "../companies/import";
import { useTestEnv } from "../testing/factory";
import { applyToIndex, ensureIndexes, indexName, replaceIndex, searchClient } from "./client";
import { companyDocuments } from "./companies";
import { findPriceField, productDocument, type SearchDocument } from "./documents";
import { SEARCH_INDEX_UIDS } from "./indexes";
import { logSearchMiss } from "./misses";
import { queueIndexChange, syncSearch } from "./outbox";
import { suggest } from "./query";

// Step 5.2 DONE WHEN, against a real Meilisearch and PostgreSQL: a search with a typo ("electrolyzer", "compresor")
// finds the right results across types; no product document in the index has a price field; a record that readers may
// no longer see (an unpublished article) is removed by the outbox sync; zero-result searches are logged. The tests use
// their own prefixed copies of the indexes, removed afterwards.
//
// Needs TEST_DATABASE_URL and TEST_MEILI_MASTER_KEY (CI sets both; locally use the key from .env.local).

const url = process.env.TEST_DATABASE_URL;
const meiliKey = process.env.TEST_MEILI_MASTER_KEY;

const doc = (id: string, title: string, extra: Record<string, unknown> = {}): SearchDocument => ({
  id,
  title,
  meta: "",
  href: `/x/${id}`,
  ...extra,
});

describe.skipIf(!url || !meiliKey)("search", () => {
  let h: DbHandle;
  const tag = `t${String(Date.now())}`;
  const prefix = `${tag}_`;

  beforeAll(async () => {
    useTestEnv(url ?? "");
    process.env.MEILI_HOST = process.env.TEST_MEILI_HOST ?? "http://localhost:7700";
    process.env.MEILI_MASTER_KEY = meiliKey;
    process.env.SEARCH_INDEX_PREFIX = prefix;
    h = createDb(url ?? "", { max: 2 });
    await ensureIndexes();
    await replaceIndex("companies", [
      doc("c1", "Hydrotek Systems", { name: "Hydrotek Systems", summary: "PEM electrolysers, compressors, storage" }),
      doc("c2", "Varun Gas Equipment", { name: "Varun Gas Equipment", summary: "Cylinders and cascades" }),
    ]);
    await replaceIndex("articles", [
      doc("a1", "What the latest electrolyser tranche means for Indian buyers", { standfirst: "SIGHT tranche II" }),
      doc("a2", "Hydrogen bus pilot in Leh passes one lakh km", { standfirst: "Fuel cell buses at altitude" }),
    ]);
    await replaceIndex("tenders", [
      doc("t1", "Supply of a hydrogen compressor skid, Panipat", {
        issuer: "IOCL",
        description: "Diaphragm compressor",
      }),
    ]);
    await replaceIndex("products", [
      productDocument({
        id: "p1",
        title: "PEM Electrolyser 50 kW",
        meta: "",
        href: "/p/1",
        name: "PEM Electrolyser 50 kW",
      }),
      productDocument({
        id: "p2",
        title: "Diaphragm compressor 350 bar",
        meta: "",
        href: "/p/2",
        name: "Diaphragm compressor 350 bar",
        price: 1_00_000,
      }),
    ]);
  }, 60_000);

  afterAll(async () => {
    const ms = searchClient();
    for (const uid of SEARCH_INDEX_UIDS) await ms.deleteIndexIfExists(indexName(uid));
    await h.pool.end();
  });

  it("forgives typos across content types", async () => {
    const electrolyzer = await suggest("electrolyzer", "all");
    const titles = electrolyzer.groups.flatMap((g) => g.hits.map((x) => `${g.index}:${x.title}`));
    expect(titles).toContain("companies:Hydrotek Systems");
    expect(titles).toContain("articles:What the latest electrolyser tranche means for Indian buyers");
    expect(titles).toContain("products:PEM Electrolyser 50 kW");

    const compresor = await suggest("compresor", "all");
    const found = compresor.groups.flatMap((g) => g.hits.map((x) => `${g.index}:${x.id}`));
    expect(found).toEqual(expect.arrayContaining(["companies:c1", "tenders:t1", "products:p2"]));
    expect(found).not.toContain("companies:c2");
  });

  it("knows H2 means hydrogen", async () => {
    const res = await suggest("h2 bus", "news");
    expect(res.groups[0]?.hits.map((x) => x.id)).toContain("a2");
  });

  it("holds no product document with a price field", async () => {
    const { results } = await searchClient().index(indexName("products")).getDocuments({ limit: 1000 });
    expect(results.length).toBeGreaterThan(0);
    for (const d of results) expect(findPriceField(d), String(d.id)).toBeNull();
  });

  it("answers with no results, not an error, before the worker has created an index", async () => {
    await searchClient().deleteIndexIfExists(indexName("events"));
    expect(await suggest("electrolyser", "events")).toMatchObject({ groups: [], total: 0 });
    expect((await searchClient().index(indexName("events")).getStats()).numberOfDocuments).toBe(0);
  });

  it("applies outbox changes: a record readers may no longer see leaves search", async () => {
    await applyToIndex("articles", [doc("a3", `Draft piece ${tag}`)], []);
    expect((await suggest(`Draft piece ${tag}`, "news")).groups[0]?.hits.map((x) => x.id)).toContain("a3");

    // The article was unpublished: the change is queued, and the loader no longer returns it.
    await queueIndexChange(h.db, "articles", ["a3"]);
    const report = await syncSearch(h.db, () => Promise.resolve(new Map<string, SearchDocument>()));
    expect(report.failed).toBe(0);
    expect(report.applied).toBeGreaterThanOrEqual(1);
    const after = await suggest(`Draft piece ${tag}`, "news");
    expect(after.groups.flatMap((g) => g.hits.map((x) => x.id))).not.toContain("a3");

    const rows = await h.db
      .select({ processedAt: schema.searchOutbox.processedAt })
      .from(schema.searchOutbox)
      .where(eq(schema.searchOutbox.recordId, "a3"));
    expect(rows.every((r) => r.processedAt !== null)).toBe(true);
  });

  it("keeps a failed change for the next run, with its error", async () => {
    await queueIndexChange(h.db, "articles", [`${tag}-boom`]);
    const report = await syncSearch(h.db, () => Promise.reject(new Error("CMS unavailable")));
    expect(report.failed).toBeGreaterThanOrEqual(1);
    const [row] = await h.db
      .select()
      .from(schema.searchOutbox)
      .where(eq(schema.searchOutbox.recordId, `${tag}-boom`));
    expect(row?.processedAt).toBeNull();
    expect(row?.attempts).toBe(1);
    expect(row?.lastError).toBe("CMS unavailable");
    // Clear it so later runs in this database don't keep retrying a record that never existed.
    await h.db.delete(schema.searchOutbox).where(eq(schema.searchOutbox.recordId, `${tag}-boom`));
  });

  it("queues imported companies, and keeps sample profiles out where samples are hidden", async () => {
    const report = await importCompanies(
      [{ key: `${tag}-sample`, legal_name: `Sample Hydrogen ${tag} Pvt Ltd`, kind: "supplier", state: "Gujarat" }],
      { apply: true, firstRow: 1, sample: true },
    );
    expect(report.counts.create).toBe(1);
    const [profile] = await h.db
      .select({ id: schema.companyProfiles.organisationId })
      .from(schema.companyProfiles)
      .where(eq(schema.companyProfiles.importKey, `${tag}-sample`));
    const queued = await h.db
      .select()
      .from(schema.searchOutbox)
      .where(inArray(schema.searchOutbox.recordId, [profile?.id ?? ""]));
    expect(queued.map((r) => r.indexUid)).toEqual(["companies"]);

    expect(await companyDocuments(h.db, { includeSample: false, ids: [profile?.id ?? ""] })).toEqual([]);
    const [shown] = await companyDocuments(h.db, { includeSample: true, ids: [profile?.id ?? ""] });
    expect(shown?.title).toBe(`Sample Hydrogen ${tag} Pvt Ltd`);
    expect(shown?.href).toMatch(/^\/directory\/companies\//);
    expect(findPriceField(shown)).toBeNull();
  });

  it("logs finished searches that found nothing, without who searched", async () => {
    await logSearchMiss(h.db, { query: `  Flare STAK ${tag}  `, scope: "all", source: "page" });
    await logSearchMiss(h.db, { query: "x", scope: "all", source: "header" });
    const rows = await h.db
      .select()
      .from(schema.searchMisses)
      .where(eq(schema.searchMisses.query, `flare stak ${tag}`.toLowerCase()));
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(["createdAt", "id", "query", "scope", "source"]);
  });
});
