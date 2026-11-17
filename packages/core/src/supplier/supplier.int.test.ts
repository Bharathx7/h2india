import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import {
  categoryRequestQueue,
  companyCategoryRequests,
  decideCategoryRequest,
  requestCategory,
} from "../catalogue/requests";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { supplierChecklist } from "./checklist";
import { supplierOf } from "./context";
import { latestReview, submitForReview, SupplierReviewError } from "./review";
import {
  decideDocument,
  expireDocuments,
  grantBadge,
  listBadges,
  listDocuments,
  publicBadges,
  revokeBadge,
  uploadDocument,
  VerificationError,
} from "./verification";

// Stage 8 supplier records, against PostgreSQL. Each step adds its checks here, and a case proving supplier B
// cannot read or change supplier A's records (CLAUDE.md, step 3.4).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("supplier workspace", () => {
  let h: DbHandle;
  let a: Awaited<ReturnType<typeof makeCompany>>;
  let b: Awaited<ReturnType<typeof makeCompany>>;
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    a = await makeCompany(h.db, "Pranava", "supplier");
    b = await makeCompany(h.db, "Bharat", "supplier");
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("8.1: the checklist follows the records, and review opens only when ready", async () => {
    const actor = await loadActor(h.db, a.admin.id);
    expect((await supplierOf(h.db, actor))?.organisationId).toBe(a.org.id);
    expect((await supplierChecklist(h.db, a.org.id)).done).toBe(0);
    await h.db.update(schema.organisations).set({ state: "Tamil Nadu" }).where(eq(schema.organisations.id, a.org.id));
    await h.db
      .insert(schema.organisationGstins)
      .values({ organisationId: a.org.id, gstin: `33AAJCP${String(Date.now()).slice(-4)}L1Z4`, stateCode: "33" });
    expect((await supplierChecklist(h.db, a.org.id)).items[0]).toMatchObject({
      state: "todo",
      detail: expect.stringContaining("upload your GST certificate and PAN") as unknown,
    });
    await expect(submitForReview(h.db, actor, a.org.id)).rejects.toBeInstanceOf(SupplierReviewError);
    // A Viewer can't submit.
    await expect(submitForReview(h.db, await loadActor(h.db, a.requester.id), a.org.id)).rejects.toThrow("admin");
  });

  it("supplier B cannot read or submit supplier A's review", async () => {
    const bActor = await loadActor(h.db, b.admin.id);
    await h.db.insert(schema.supplierReviews).values({ organisationId: a.org.id, submittedBy: a.admin.id });
    expect(await latestReview(h.db, scopeFor(bActor), a.org.id)).toBeNull();
    expect((await latestReview(h.db, scopeFor(await loadActor(h.db, a.admin.id)), a.org.id))?.status).toBe("Submitted");
    await expect(submitForReview(h.db, bActor, a.org.id)).rejects.toThrow();
  });

  /** An uploaded file that passed its checks, owned by the uploader (what the worker leaves behind). */
  async function file(userId: string, organisationId: string) {
    const [f] = await h.db
      .insert(schema.files)
      .values({
        kind: "verification_document",
        status: "Available",
        uploadedBy: userId,
        organisationId,
        name: "doc.pdf",
        declaredType: "application/pdf",
        declaredBytes: 1000,
        quarantineKey: `q/${String(Math.random())}`,
        bucket: "private",
        objectKey: `o/${String(Math.random())}`,
      })
      .returning();
    return f?.id ?? "";
  }

  async function operator() {
    const op = await makeUser(h.db, "Anita Operator");
    await h.db.execute(
      sql`insert into core.operator_roles (user_id, role_id) select ${op.id}, id from core.roles where scope = 'operator' and name = 'Super admin'`,
    );
    return loadActor(h.db, op.id);
  }

  it("8.2: only an operator grants a badge, from verified documents, with today's date; expiry pauses it", async () => {
    const actor = await loadActor(h.db, a.admin.id);
    const op = await operator();
    const gst = await uploadDocument(h.db, actor, a.org.id, {
      type: "gstin",
      number: "33AAJCP7712L1Z4",
      fileId: await file(a.admin.id, a.org.id),
      expiresOn: new Date(Date.now() + 5 * 86_400_000),
    });
    expect((await supplierChecklist(h.db, a.org.id)).items[0]?.state).toBe("todo");
    const pan = await uploadDocument(h.db, actor, a.org.id, {
      type: "pan",
      number: "AAJCP7712L",
      fileId: await file(a.admin.id, a.org.id),
    });
    // 8.1 DONE WHEN: the upload shows on the checklist at once.
    expect((await supplierChecklist(h.db, a.org.id)).items[0]?.state).toBe("checking");
    // A supplier can't grant itself a badge, and nothing is granted before the documents are verified.
    await expect(
      grantBadge(h.db, actor, { organisationId: a.org.id, kind: "verified_supplier", evidence: "x" }),
    ).rejects.toThrow();
    await expect(
      grantBadge(h.db, op, { organisationId: a.org.id, kind: "verified_supplier", evidence: "GST and PAN" }),
    ).rejects.toBeInstanceOf(VerificationError);
    await expect(decideDocument(h.db, op, { documentId: pan.id, outcome: "Needs re-upload" })).rejects.toThrow(
      "what to fix",
    );
    await decideDocument(h.db, op, { documentId: gst.id, outcome: "Verified" });
    await decideDocument(h.db, op, { documentId: pan.id, outcome: "Verified" });
    // Founder QC (17 Nov 2026): the supplier's admins hear that a document is verified (in the app).
    const events = (
      await h.db
        .select({ event: schema.notifications.event })
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, a.admin.id))
    ).map((n) => n.event);
    expect(events).toContain("verification.document_verified");
    // An open Submit for review is answered by the badge (it stayed in Needs action before).
    const [review] = await h.db
      .insert(schema.supplierReviews)
      .values({ organisationId: a.org.id, submittedBy: a.admin.id })
      .returning();
    await grantBadge(h.db, op, {
      organisationId: a.org.id,
      kind: "verified_supplier",
      evidence: "GST and PAN checked",
    });
    const [closed] = await h.db
      .select({ status: schema.supplierReviews.status })
      .from(schema.supplierReviews)
      .where(eq(schema.supplierReviews.id, review?.id ?? ""));
    expect(closed?.status).toBe("Approved");
    const shown = await publicBadges(h.db, a.org.id);
    expect(shown.map((b) => b.label)).toEqual(["Verified supplier"]);
    expect(shown[0]?.lastCheckedAt.toDateString()).toBe(new Date().toDateString());
    const [org] = await h.db.select().from(schema.organisations).where(eq(schema.organisations.id, a.org.id));
    expect(org?.verification).toBe("Verified");

    // The GST certificate lapses: the badge pauses and the company is no longer shown as verified.
    await expireDocuments(h.db, new Date(Date.now() + 6 * 86_400_000));
    expect((await listBadges(h.db, scopeFor(actor), a.org.id))[0]?.status).toBe("Paused");
    expect(await publicBadges(h.db, a.org.id)).toEqual([]);
    const [after] = await h.db.select().from(schema.organisations).where(eq(schema.organisations.id, a.org.id));
    expect(after?.verification).not.toBe("Verified");
  });

  it("8.2: revoking needs a reason and is in the audit log", async () => {
    const op = await operator();
    const [badge] = await h.db
      .insert(schema.supplierBadges)
      .values({ organisationId: b.org.id, kind: "made_in_india_self", evidence: "declared" })
      .returning();
    await expect(revokeBadge(h.db, op, { badgeId: badge?.id ?? "", reason: " ", note: "" })).rejects.toThrow("reason");
    await revokeBadge(h.db, op, {
      badgeId: badge?.id ?? "",
      reason: "Complaint upheld after review",
      note: "Not made here.",
    });
    const log = await h.db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.resourceId, badge?.id ?? ""), eq(schema.auditLog.action, "badge.revoked")));
    expect(log.length).toBe(1);
  });

  it("supplier B never sees supplier A's documents or badges, and can't upload for A", async () => {
    const bActor = await loadActor(h.db, b.admin.id);
    expect(await listDocuments(h.db, scopeFor(bActor), a.org.id)).toEqual([]);
    expect(await listBadges(h.db, scopeFor(bActor), a.org.id)).toEqual([]);
    await expect(
      uploadDocument(h.db, bActor, a.org.id, {
        type: "pan",
        number: "AAJCP7712L",
        fileId: await file(b.admin.id, b.org.id),
      }),
    ).rejects.toThrow("Not allowed");
  });
  it("supplier QC: a category request goes to the queue; B can't see or make A's; approving adds the category", async () => {
    const aActor = await loadActor(h.db, a.admin.id);
    const bActor = await loadActor(h.db, b.admin.id);
    const label = `Hydrogen leak sensors ${String(Date.now()).slice(-6)}`;
    const made = await requestCategory(h.db, aActor, a.org.id, {
      classId: "components",
      label,
      description: "Fixed and portable hydrogen leak detectors",
    });
    // B can neither read A's requests nor ask in A's name; a Viewer can't ask at all.
    expect(await companyCategoryRequests(h.db, scopeFor(bActor), a.org.id)).toEqual([]);
    await expect(
      requestCategory(h.db, bActor, a.org.id, { classId: "components", label: "X", description: "Y" }),
    ).rejects.toThrow("Not allowed");
    await expect(
      requestCategory(h.db, await loadActor(h.db, a.requester.id), a.org.id, {
        classId: "components",
        label: "X",
        description: "Y",
      }),
    ).rejects.toThrow("Not allowed");
    expect((await companyCategoryRequests(h.db, scopeFor(aActor), a.org.id)).map((x) => x.id)).toContain(made.id);

    // A supplier can't decide; a Catalogue moderator approves under a settled name.
    await expect(
      decideCategoryRequest(h.db, aActor, { id: made.id, decision: "reject", reason: "no" }),
    ).rejects.toThrow("Not allowed");
    const mod = await makeUser(h.db, "Category moderator");
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Catalogue moderator")));
    await h.db.insert(schema.operatorRoles).values({ userId: mod.id, roleId: role?.id ?? "" });
    const op = await loadActor(h.db, mod.id);
    expect((await categoryRequestQueue(h.db, op)).map((x) => x.id)).toContain(made.id);
    const { categoryId } = await decideCategoryRequest(h.db, op, {
      id: made.id,
      decision: "approve",
      classId: "components",
      label,
    });
    const [request] = await h.db.select().from(schema.categoryRequests).where(eq(schema.categoryRequests.id, made.id));
    expect(request).toMatchObject({ status: "Approved", categoryId });
    const [category] = await h.db
      .select({ label: schema.catalogueCategories.label })
      .from(schema.catalogueCategories)
      .where(eq(schema.catalogueCategories.id, categoryId ?? ""));
    expect(category?.label).toBe(label);
    // Decided once only.
    await expect(decideCategoryRequest(h.db, op, { id: made.id, decision: "reject", reason: "late" })).rejects.toThrow(
      "already",
    );
  });
});
