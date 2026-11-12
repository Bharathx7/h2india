import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor, VISITOR } from "../authz/actor";
import { completeUpload, processFile, startUpload } from "../files/files";
import { makeUser, twoCompanies, useTestEnv } from "../testing/factory";
import { recoveryForReview } from "./recovery";
import { closeSupportRequest, submitSupportRequest } from "./support";

// Lost email support request (528:534, step 3.7, A16, A22, A23).
const url = process.env.TEST_DATABASE_URL;
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

describe.skipIf(!url)("support request", () => {
  let h: DbHandle;
  let data: Awaited<ReturnType<typeof twoCompanies>>;
  const workId = async (ip: string) => {
    const started = await startUpload({
      actor: VISITOR,
      kind: "work_id",
      name: "work-id.pdf",
      type: "application/pdf",
      bytes: PDF.length,
      ip,
    });
    await fetch(started.uploadUrl, { method: "PUT", body: PDF, headers: { "content-type": started.type } });
    await completeUpload({ actor: VISITOR, fileId: started.id, key: started.key }, () => Promise.resolve());
    await processFile(started.id);
    return started;
  };
  const operator = async (role: string) => {
    const person = await makeUser(h.db, `Support ${role}`);
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db.insert(schema.operatorRoles).values({ userId: person.id, roleId: r?.id ?? "" });
    return loadActor(h.db, person.id);
  };

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    data = await twoCompanies(h.db);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("stores the request with a SUP reference, attaches the Work ID and lets only support review and close it", async () => {
    const ip = "203.0.113.77";
    const file = await workId(ip);
    const sent = await submitSupportRequest({
      actor: VISITOR,
      fullName: "Arjun  Shah",
      company: "Greenfield Hydrogen",
      contactEmail: "Arjun.Shah.Work@example.com",
      fileId: file.id,
      fileKey: file.key,
      ip,
    });
    expect(sent.reference).toMatch(/^SUP-\d{4}-\d{5}$/);
    const [row] = await h.db.select().from(schema.recoveryRequests).where(eq(schema.recoveryRequests.id, sent.id));
    expect(row).toMatchObject({
      kind: "support",
      status: "Waiting for support",
      contactName: "Arjun Shah",
      contactEmail: "arjun.shah.work@example.com",
      documentFileId: file.id,
    });
    const [stored] = await h.db.select().from(schema.files).where(eq(schema.files.id, file.id));
    expect(stored).toMatchObject({ attachedType: "recovery_request", attachedId: sent.id });

    // A company admin and a Content editor can't see it; support (Operations) can.
    expect(await recoveryForReview(await loadActor(h.db, data.a.admin.id), sent.id)).toBeNull();
    expect(await recoveryForReview(await operator("Content editor"), sent.id)).toBeNull();
    const support = await operator("Operations");
    expect((await recoveryForReview(support, sent.id))?.r.reference).toBe(sent.reference);

    await expect(closeSupportRequest({ actor: await operator("Finance"), requestId: sent.id })).rejects.toMatchObject({
      code: "NOT_ALLOWED",
    });
    await closeSupportRequest({ actor: support, requestId: sent.id });
    const [closed] = await h.db.select().from(schema.files).where(eq(schema.files.id, file.id));
    const days = ((closed?.deleteAfter?.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it("refuses a Work ID that isn't the sender's, and missing fields", async () => {
    const ip = "203.0.113.78";
    const file = await workId(ip);
    const base = { actor: VISITOR, fullName: "A Person", company: "Co", contactEmail: "a@example.com", ip };
    await expect(submitSupportRequest({ ...base, fileId: file.id, fileKey: "not-the-key" })).rejects.toMatchObject({
      field: "file",
    });
    await expect(
      submitSupportRequest({ ...base, contactEmail: "nope", fileId: file.id, fileKey: file.key }),
    ).rejects.toMatchObject({ field: "contactEmail" });
  });
});
