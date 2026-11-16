import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { must } from "../must";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { decideAppeal, listAppeals, sendAppeal, suspensionOf } from "./appeals";
import { suspendCompany } from "./users";

// G10: a suspended company appeals from its workspace; an operator lifts or keeps the suspension with a note.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("suspension appeals (G10)", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("appeals once, and lifting brings the company back", async () => {
    const c = await makeCompany(h.db, "Appeal", "supplier");
    const op = await makeUser(h.db, "Appeal operator");
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Super admin")));
    await h.db.insert(schema.operatorRoles).values({ userId: op.id, roleId: must(role).id });
    const operator = await loadActor(h.db, op.id);
    const admin = await loadActor(h.db, c.admin.id);
    await expect(sendAppeal(h.db, admin, c.org.id, "We were never told why; please look again.")).rejects.toThrow(
      "isn't suspended",
    );
    await suspendCompany(h.db, operator, c.org.id, "Counterfeit certificate reported");
    await expect(sendAppeal(h.db, admin, c.org.id, "Too short")).rejects.toThrow("few sentences");
    await sendAppeal(
      h.db,
      admin,
      c.org.id,
      "The certificate is genuine; the issuer confirmed it in writing yesterday.",
    );
    await expect(
      sendAppeal(h.db, admin, c.org.id, "Sending the same appeal a second time to make sure."),
    ).rejects.toThrow("already with H2 Economy");
    // Someone without company.manage can't appeal.
    await expect(
      sendAppeal(h.db, await loadActor(h.db, c.requester.id), c.org.id, "A viewer trying to appeal for the company."),
    ).rejects.toThrow();
    const appeal = must((await listAppeals(h.db, operator)).find((r) => r.appeal.organisationId === c.org.id));
    await decideAppeal(h.db, operator, appeal.appeal.id, { lift: true, note: "Issuer confirmed the certificate." });
    expect(await suspensionOf(h.db, c.org.id)).toBeNull();
  });
});
