import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { makeUser, useTestEnv } from "../testing/factory";
import { ensureIndexes, replaceIndex } from "./client";
import { saveSynonyms, SEARCH_SYNONYMS } from "./manage";
import { searchIndex } from "./query";
import { getSetting } from "../settings";

// Step 11.3 DONE WHEN: adding a synonym changes search results within a minute (here: at once).
const url = process.env.TEST_DATABASE_URL;
const meiliKey = process.env.TEST_MEILI_MASTER_KEY;

describe.skipIf(!url || !meiliKey)("search management", () => {
  let h: DbHandle;
  beforeAll(async () => {
    useTestEnv(url ?? "");
    process.env.MEILI_HOST = process.env.TEST_MEILI_HOST ?? "http://localhost:7700";
    process.env.MEILI_MASTER_KEY = meiliKey;
    process.env.SEARCH_INDEX_PREFIX = `m${String(Date.now())}_`;
    h = createDb(url ?? "", { max: 2 });
    await ensureIndexes(["products"]);
    await replaceIndex("products", [
      {
        id: "p1",
        title: "Type IV composite cylinder, 350 bar",
        name: "Type IV composite cylinder, 350 bar",
        meta: "Storage",
        href: "/x",
      },
    ]);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("a new synonym finds what the search missed", async () => {
    expect((await searchIndex("products", "t4 tank")).total).toBe(0);
    const u = await makeUser(h.db, "Search admin");
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Super admin")));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    const admin = await loadActor(h.db, u.id);
    const before = await getSetting(h.db, SEARCH_SYNONYMS);
    await saveSynonyms(h.db, admin, [...before, ["t4", "type iv"], ["tank", "cylinder"]]);
    expect((await searchIndex("products", "t4 tank")).total).toBe(1);
    await saveSynonyms(h.db, admin, before);
  });
});
