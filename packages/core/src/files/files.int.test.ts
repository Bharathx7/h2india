import { auditLog, createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor, VISITOR } from "../authz/actor";
import { makeUser, twoCompanies, useTestEnv } from "../testing/factory";
import { completeUpload, fileLink, fileStatus, processFile, startUpload, sweepFiles, UPLOAD_LIMITS } from "./files";
import { buckets, headObject, signDownload } from "./storage";

// Step 3.7 DONE WHEN: an EICAR test file is rejected and never becomes downloadable; a signed link stops working
// after it expires; a user from another company cannot obtain a link. Needs storage and ClamAV (docker compose, CI).
const url = process.env.TEST_DATABASE_URL;

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const noQueue = () => Promise.resolve();

describe.skipIf(!url)("files", () => {
  let h: DbHandle;
  let data: Awaited<ReturnType<typeof twoCompanies>>;
  const operator = async (role: string) => {
    const person = await makeUser(h.db, `Files ${role}`);
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db.insert(schema.operatorRoles).values({ userId: person.id, roleId: r?.id ?? "" });
    return loadActor(h.db, person.id);
  };
  /** Start, PUT the bytes like a browser would, finish, then run the worker's check. */
  const upload = async (input: Parameters<typeof startUpload>[0], body: Uint8Array) => {
    const started = await startUpload(input);
    const put = await fetch(started.uploadUrl, {
      method: "PUT",
      body: Buffer.from(body),
      headers: { "content-type": started.type },
    });
    expect(put.status).toBe(200);
    await completeUpload({ actor: input.actor, fileId: started.id, key: started.key }, noQueue);
    const status = await processFile(started.id);
    return { ...started, status };
  };

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    data = await twoCompanies(h.db);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("rejects an EICAR test file, and it never becomes downloadable", async () => {
    const admin = await loadActor(h.db, data.a.admin.id);
    const file = await upload(
      {
        actor: admin,
        kind: "verification_document",
        name: "certificate.pdf",
        type: "application/pdf",
        bytes: EICAR.length,
        organisationId: data.a.org.id,
      },
      Buffer.from(EICAR),
    );
    expect(file.status).toBe("Rejected");
    const view = await fileStatus({ actor: admin, fileId: file.id });
    expect(view.problem).toBe("certificate.pdf failed our virus check and was deleted. Upload a different file.");
    await expect(fileLink({ actor: admin, fileId: file.id })).rejects.toThrow("can't be opened");
    expect(await headObject(buckets().quarantine, file.id)).toBeNull();
    const [row] = await h.db.select().from(schema.files).where(eq(schema.files.id, file.id));
    expect(row).toMatchObject({ status: "Rejected", rejectReason: "virus", bucket: null, objectKey: null });
    const [entry] = await h.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "file.virus_found"), eq(auditLog.resourceId, file.id)));
    expect(entry?.after).toMatchObject({ kind: "verification_document" });
  });

  it("checks the type by content, not by the name or the browser's word", async () => {
    const admin = await loadActor(h.db, data.a.admin.id);
    const file = await upload(
      {
        actor: admin,
        kind: "verification_document",
        name: "scan.pdf",
        type: "application/pdf",
        bytes: 12,
        organisationId: data.a.org.id,
      },
      Buffer.from("<html></html"),
    ).catch(() => null);
    // 12 declared, 13 sent: storage refuses a body that differs from the signed size, or the worker refuses the type.
    if (file) expect(file.status).not.toBe("Available");
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    const second = await upload(
      {
        actor: admin,
        kind: "verification_document",
        name: "scan.pdf",
        type: "application/pdf",
        bytes: html.length,
        organisationId: data.a.org.id,
      },
      html,
    );
    expect(second.status).toBe("Rejected");
    expect((await fileStatus({ actor: admin, fileId: second.id })).problem).toBe(
      "scan.pdf can't be used. Use PDF, JPG or PNG, up to 10 MB.",
    );
  });

  it("refuses wrong types and sizes before any upload", async () => {
    const admin = await loadActor(h.db, data.a.admin.id);
    const base = { actor: admin, kind: "verification_document", organisationId: data.a.org.id };
    await expect(startUpload({ ...base, name: "x.tiff", type: "image/tiff", bytes: 10 })).rejects.toMatchObject({
      code: "type",
    });
    await expect(
      startUpload({ ...base, name: "big.pdf", type: "application/pdf", bytes: 11 * 1024 * 1024 }),
    ).rejects.toThrow("big.pdf is 11 MB. Use PDF, JPG or PNG, up to 10 MB.");
    await expect(
      startUpload({ ...base, kind: "logo", name: "event-logo.png", type: "image/png", bytes: 14 * 1024 * 1024 }),
    ).rejects.toThrow("event-logo.png is 14 MB. Use PNG, JPG or SVG, up to 5 MB.");
  });

  it("lets only the right people obtain a link; another company cannot", async () => {
    const admin = await loadActor(h.db, data.a.admin.id);
    const file = await upload(
      {
        actor: admin,
        kind: "verification_document",
        name: "gst-certificate.pdf",
        type: "application/pdf",
        bytes: PDF.length,
        organisationId: data.a.org.id,
      },
      PDF,
    );
    expect(file.status).toBe("Available");

    const link = await fileLink({ actor: admin, fileId: file.id, context: { requestId: "req-file-1" } });
    const res = await fetch(link.url);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(PDF)).toBe(true);

    const otherCompany = await loadActor(h.db, data.b.admin.id);
    await expect(fileLink({ actor: otherCompany, fileId: file.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(fileStatus({ actor: otherCompany, fileId: file.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    // Same company, but a Requester can't see verification documents (least access).
    const requester = await loadActor(h.db, data.a.requester.id);
    await expect(fileLink({ actor: requester, fileId: file.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(fileLink({ actor: VISITOR, fileId: file.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    // An operator who works with verification can; one who doesn't, can't.
    expect((await fileLink({ actor: await operator("Supplier verifier"), fileId: file.id })).url).toContain("X-Amz");
    await expect(fileLink({ actor: await operator("Content editor"), fileId: file.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const opened = await h.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "file.open"), eq(auditLog.resourceId, file.id)));
    expect(opened.length).toBe(2);
    expect(opened.some((e) => e.requestId === "req-file-1")).toBe(true);
  });

  it("stops a signed link working after it expires", async () => {
    const admin = await loadActor(h.db, data.a.admin.id);
    const file = await upload(
      {
        actor: admin,
        kind: "verification_document",
        name: "short.pdf",
        type: "application/pdf",
        bytes: PDF.length,
        organisationId: data.a.org.id,
      },
      PDF,
    );
    const [row] = await h.db.select().from(schema.files).where(eq(schema.files.id, file.id));
    const url = await signDownload(row?.bucket ?? "", row?.objectKey ?? "", {
      seconds: 1,
      type: "application/pdf",
      fileName: "short.pdf",
    });
    expect((await fetch(url)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 2100));
    expect((await fetch(url)).status).toBe(403);
  });

  it("strips photo metadata, makes smaller sizes, and turns an SVG logo into a PNG", async () => {
    const admin = await loadActor(h.db, data.a.admin.id);
    const photo = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 42, g: 157, b: 85 } },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "secret-location" } } })
      .toBuffer();
    expect((await sharp(photo).metadata()).exif).toBeDefined();
    const image = await upload(
      {
        actor: admin,
        kind: "product_image",
        name: "stack.jpg",
        type: "image/jpeg",
        bytes: photo.length,
        organisationId: data.a.org.id,
      },
      photo,
    ).catch(() => null); // A buyer company has no product.manage; a supplier company is used below.
    expect(image).toBeNull();

    const supplierOrg = await h.db
      .insert(schema.organisations)
      .values({ kind: "supplier", legalName: "Files Supplier", verification: "Unverified" })
      .returning();
    const owner = await makeUser(h.db, "Files Supplier Admin");
    await h.db
      .insert(schema.memberships)
      .values({ organisationId: supplierOrg[0]?.id ?? "", userId: owner.id, role: "Admin" });
    const supplier = await loadActor(h.db, owner.id);
    const stored = await upload(
      {
        actor: supplier,
        kind: "product_image",
        name: "stack.jpg",
        type: "image/jpeg",
        bytes: photo.length,
        organisationId: supplierOrg[0]?.id,
      },
      photo,
    );
    expect(stored.status).toBe("Available");
    const [row] = await h.db.select().from(schema.files).where(eq(schema.files.id, stored.id));
    expect(Object.keys(row?.variants ?? {}).sort()).toEqual(["320", "640"]);
    const link = await fileLink({ actor: supplier, fileId: stored.id });
    const clean = Buffer.from(await (await fetch(link.url)).arrayBuffer());
    const meta = await sharp(clean).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.width).toBe(800);

    const svg = Buffer.from(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><script>alert(1)</script><rect width="120" height="40" fill="teal"/></svg>',
    );
    const logo = await upload(
      {
        actor: supplier,
        kind: "logo",
        name: "logo.svg",
        type: "image/svg+xml",
        bytes: svg.length,
        organisationId: supplierOrg[0]?.id,
      },
      svg,
    );
    expect(logo.status).toBe("Available");
    const [logoRow] = await h.db.select().from(schema.files).where(eq(schema.files.id, logo.id));
    expect(logoRow?.detectedType).toBe("image/png");
    expect(logoRow?.objectKey).toMatch(/original\.png$/);
  });

  it("lets a signed-out person upload a Work ID with a key, limited per IP address", async () => {
    const ip = `198.51.100.${String(Math.floor(Math.random() * 200))}`;
    const file = await upload(
      { actor: VISITOR, kind: "work_id", name: "id.pdf", type: "application/pdf", bytes: PDF.length, ip },
      PDF,
    );
    expect(file.key).toBeTruthy();
    expect(file.status).toBe("Available");
    await expect(fileStatus({ actor: VISITOR, fileId: file.id, key: "wrong" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await fileStatus({ actor: VISITOR, fileId: file.id, key: file.key })).status).toBe("Available");
    // Signed out, a verification document is refused.
    await expect(
      startUpload({
        actor: VISITOR,
        kind: "verification_document",
        name: "a.pdf",
        type: "application/pdf",
        bytes: 9,
        ip,
      }),
    ).rejects.toMatchObject({ code: "NOT_ALLOWED" });
    for (let i = 1; i < UPLOAD_LIMITS.perIpHour; i++) {
      await startUpload({ actor: VISITOR, kind: "work_id", name: "id.pdf", type: "application/pdf", bytes: 9, ip });
    }
    await expect(
      startUpload({ actor: VISITOR, kind: "work_id", name: "id.pdf", type: "application/pdf", bytes: 9, ip }),
    ).rejects.toMatchObject({ code: "TOO_MANY" });
  });

  it("removes files after their retention date", async () => {
    const ip = "198.51.100.250";
    const file = await upload(
      { actor: VISITOR, kind: "work_id", name: "old-id.pdf", type: "application/pdf", bytes: PDF.length, ip },
      PDF,
    );
    const [row] = await h.db.select().from(schema.files).where(eq(schema.files.id, file.id));
    await h.db
      .update(schema.files)
      .set({ deleteAfter: new Date(Date.now() - 1000) })
      .where(eq(schema.files.id, file.id));
    const result = await sweepFiles(noQueue);
    expect(result.deleted).toBeGreaterThanOrEqual(1);
    expect(await headObject(row?.bucket ?? "", row?.objectKey ?? "")).toBeNull();
    await expect(fileLink({ actor: VISITOR, fileId: file.id, key: file.key })).rejects.toThrow("can't be opened");
  });
});
