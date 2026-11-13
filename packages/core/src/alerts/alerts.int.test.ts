import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAlert } from "../members/alerts";
import { applyToIndex, ensureIndexes, indexName, searchClient } from "../search/client";
import { queueIndexChange } from "../search/outbox";
import { makeUser, useTestEnv } from "../testing/factory";
import { alertOffToken, matchAlerts, sendAlerts, turnOffAlert } from "./engine";
import { myAlerts, recordAlert } from "./manage";

// Step 7.3 DONE WHEN, against a real Meilisearch and PostgreSQL: a new tender matching an alert triggers one message
// on the chosen channel and frequency; publishing the same tender again (an update) does not send it again; turning
// off one alert leaves the others working. Needs TEST_DATABASE_URL and TEST_MEILI_MASTER_KEY; emails go to Mailpit.

const url = process.env.TEST_DATABASE_URL;
const meiliKey = process.env.TEST_MEILI_MASTER_KEY;

const tender = (id: string, title: string, states: string[]) => ({
  id,
  title,
  meta: "IOCL · Open",
  href: `/opportunities/tenders/${id}`,
  issuer: "IOCL",
  tenderId: `IOCL/${id}`,
  states,
  topics: [],
  closesAt: Date.parse("2026-12-01T12:00:00Z"),
});

describe.skipIf(!url || !meiliKey)("alerts engine", () => {
  let h: DbHandle;
  const tag = `a${String(Date.now())}`;

  beforeAll(async () => {
    useTestEnv(url ?? "");
    process.env.MEILI_HOST = process.env.TEST_MEILI_HOST ?? "http://localhost:7700";
    process.env.MEILI_MASTER_KEY = meiliKey;
    process.env.SEARCH_INDEX_PREFIX = `${tag}_`;
    h = createDb(url ?? "", { max: 3 });
    await ensureIndexes(["tenders"]);
  });
  afterAll(async () => {
    await searchClient().deleteIndexIfExists(indexName("tenders"));
    await h.pool.end();
  });

  /** What the search worker does: write the document, then mark the outbox row applied. */
  async function publish(doc: ReturnType<typeof tender>) {
    await queueIndexChange(h.db, "tenders", [doc.id]);
    await applyToIndex("tenders", [doc], []);
    await h.db
      .update(schema.searchOutbox)
      .set({ processedAt: new Date() })
      .where(and(eq(schema.searchOutbox.recordId, doc.id), eq(schema.searchOutbox.indexUid, "tenders")));
  }
  const sends = (alertId: string) =>
    h.db.select().from(schema.alertSends).where(eq(schema.alertSends.alertId, alertId));
  // The test database is shared with other tests' alerts, which may match these tenders too: check our own rows only.
  const sent = async (alertId: string) => (await sends(alertId)).filter((x) => x.sentAt).length;
  const logged = (userId: string) =>
    h.db
      .select()
      .from(schema.notificationDeliveries)
      .where(
        and(eq(schema.notificationDeliveries.userId, userId), eq(schema.notificationDeliveries.event, "alert.matches")),
      );

  it("sends a matching new tender once, and never again on update", async () => {
    const u = await makeUser(h.db, "Rohan");
    const gujarat = await createAlert(h.db, u.id, {
      label: "Tenders · Electrolyser",
      indexUid: "tenders",
      query: "electrolyser",
      filters: { states: ["Gujarat"] },
      frequency: "instant",
    });
    const odisha = await createAlert(h.db, u.id, {
      label: "Tenders · Odisha",
      indexUid: "tenders",
      filters: { states: ["Odisha"] },
      frequency: "daily",
    });
    const t1 = tender(`${tag}-1`, "Supply of a 10 MW PEM electrolyser, Kandla", ["Gujarat"]);
    await publish(t1);
    await publish(tender(`${tag}-2`, "Hydrogen refuelling station, Bhubaneswar", ["Odisha"]));
    await matchAlerts(h.db);
    expect((await sends(gujarat.id)).map((s) => s.recordId)).toEqual([t1.id]);
    expect((await sends(odisha.id)).length).toBe(1);

    // Instant goes now; the daily one waits for its digest.
    const now = new Date();
    await sendAlerts(h.db, ["instant"], now);
    expect(await sent(gujarat.id)).toBe(1);
    expect(await sent(odisha.id)).toBe(0);
    expect((await logged(u.id)).map((d) => d.channel)).toEqual(["email"]);

    // The bid date moves: the tender is published again. No second message.
    await publish({ ...t1, title: `${t1.title} (extended)` });
    await matchAlerts(h.db);
    expect((await sends(gujarat.id)).length).toBe(1);
    await sendAlerts(h.db, ["instant"], now);
    expect((await logged(u.id)).length).toBe(1);

    // The digest sends the daily one.
    await sendAlerts(h.db, ["daily"], now);
    expect(await sent(odisha.id)).toBe(1);
    expect((await logged(u.id)).length).toBe(2);
    const rows = await myAlerts(h.db, u.id, now);
    expect(rows.find((r) => r.id === gujarat.id)).toMatchObject({ thisMonth: 1, on: true });
  });

  it("turning off one alert leaves the others working", async () => {
    const u = await makeUser(h.db, "Asha");
    const a = await createAlert(h.db, u.id, {
      label: "A",
      indexUid: "tenders",
      query: "compressor",
      frequency: "instant",
    });
    const b = await createAlert(h.db, u.id, {
      label: "B",
      indexUid: "tenders",
      query: "compressor",
      frequency: "instant",
    });
    expect(await turnOffAlert(h.db, "bad.token")).toBeNull();
    expect(await turnOffAlert(h.db, alertOffToken(a.id))).toBe("A");
    await publish(tender(`${tag}-3`, "Diaphragm compressor package, Bina", []));
    await matchAlerts(h.db);
    expect((await sends(a.id)).length).toBe(0);
    expect((await sends(b.id)).length).toBe(1);
  });

  it("a new alert doesn't get records changed before it, and the item cap holds", async () => {
    const before = tender(`${tag}-4`, "Old storage tender", []);
    await publish(before);
    await matchAlerts(h.db);
    const u = await makeUser(h.db, "Bala");
    const a = await createAlert(h.db, u.id, {
      label: "Storage",
      indexUid: "tenders",
      query: "storage",
      frequency: "instant",
    });
    const fresh = Array.from({ length: 12 }, (_, i) =>
      tender(`${tag}-s${String(i)}`, `Storage tank lot ${String(i)}`, []),
    );
    for (const d of fresh) await publish(d);
    await matchAlerts(h.db);
    const got = await sends(a.id);
    expect(got.length).toBe(12);
    expect(got.some((s) => s.recordId === before.id)).toBe(false);
    // One message for all twelve (capped at 10 shown); every item is marked sent.
    await sendAlerts(h.db, ["instant"]);
    expect(await sent(a.id)).toBe(12);
    expect((await logged(u.id)).length).toBe(1);
    const left = await h.db
      .select()
      .from(schema.alertSends)
      .where(
        inArray(
          schema.alertSends.id,
          got.map((g) => g.id),
        ),
      );
    expect(left.every((s) => s.sentAt)).toBe(true);
  });

  it("an alert on one tender is found for its page", async () => {
    const u = await makeUser(h.db, "Chitra");
    await createAlert(h.db, u.id, { label: "Tender · X", indexUid: "tenders", filters: { id: ["77"] } });
    expect((await recordAlert(h.db, u.id, "tenders", "77"))?.label).toBe("Tender · X");
    expect(await recordAlert(h.db, u.id, "tenders", "78")).toBeNull();
  });
});
