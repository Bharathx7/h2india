import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { fileLink } from "../files/files";
import { must } from "../must";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { askQuestion, reportListing } from "./detail";

// A123: attachments on Ask a question and Report this listing. A question's files open for the supplier it was asked
// of and nobody else; a report's evidence opens only for operators who handle takedowns (compliance.view).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("listing attachments (A123)", () => {
  let h: DbHandle;
  let supplier: Awaited<ReturnType<typeof makeCompany>>;
  let other: Awaited<ReturnType<typeof makeCompany>>;
  let slug = "";

  async function file(uploadedBy: string) {
    const [f] = await h.db
      .insert(schema.files)
      .values({
        kind: "listing_evidence",
        status: "Available",
        uploadedBy,
        name: "drawing.pdf",
        declaredType: "application/pdf",
        declaredBytes: 1000,
        quarantineKey: `q/${randomBytes(6).toString("hex")}`,
        bucket: "h2india-private",
        objectKey: `o/${randomBytes(6).toString("hex")}`,
      })
      .returning();
    return must(f).id;
  }

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    supplier = await makeCompany(h.db, "Attach", "supplier");
    other = await makeCompany(h.db, "Attach other", "supplier");
    const [cat] = await h.db.select({ id: schema.catalogueCategories.id }).from(schema.catalogueCategories).limit(1);
    slug = `attach-${randomBytes(4).toString("hex")}`;
    await h.db.insert(schema.products).values({
      organisationId: supplier.org.id,
      categoryId: must(cat).id,
      slug,
      name: "Attachment test valve",
      status: "Live",
    });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("a question's attachment opens for the supplier and nobody else", async () => {
    const asker = await makeUser(h.db, "Attach asker");
    const fileId = await file(asker.id);
    const r = await askQuestion(h.db, {
      slug,
      userId: asker.id,
      question: "What is the leak rate at 350 bar?",
      companyName: null,
      attachments: [{ fileId }],
    });
    expect(r.ok).toBe(true);
    const [q] = await h.db.select().from(schema.files).where(eq(schema.files.id, fileId));
    expect(q?.attachedType).toBe("product_question");
    const supplierAdmin = await loadActor(h.db, supplier.admin.id);
    expect((await fileLink({ actor: supplierAdmin, fileId })).url).toBeTruthy();
    await expect(fileLink({ actor: await loadActor(h.db, other.admin.id), fileId })).rejects.toThrow();
  });

  it("a report's evidence opens only for operators who handle takedowns", async () => {
    const reporter = await makeUser(h.db, "Attach reporter");
    const fileId = await file(reporter.id);
    const r = await reportListing(h.db, {
      slug,
      problem: "incorrect-specs",
      details: "The pressure rating on the page doesn't match the datasheet.",
      email: "",
      userId: reporter.id,
      attachments: [{ fileId }],
    });
    expect(r.ok).toBe(true);
    await expect(fileLink({ actor: await loadActor(h.db, supplier.admin.id), fileId })).rejects.toThrow();
    const op = await makeUser(h.db, "Attach compliance");
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Editor-in-chief")));
    await h.db.insert(schema.operatorRoles).values({ userId: op.id, roleId: must(role).id });
    expect((await fileLink({ actor: await loadActor(h.db, op.id), fileId })).url).toBeTruthy();
  });

  it("refuses more than three files", async () => {
    const asker = await makeUser(h.db, "Attach many");
    const r = await askQuestion(h.db, {
      slug,
      userId: asker.id,
      question: "Four drawings for one question?",
      companyName: null,
      attachments: [{ fileId: "a" }, { fileId: "b" }, { fileId: "c" }, { fileId: "d" }],
    });
    expect(r).toEqual({ ok: false, errors: { attachments: "Attach up to 3 files" } });
  });
});
