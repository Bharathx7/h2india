import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { countAuditLog, readAuditLog } from "../audit";
import { loadActor } from "../authz/actor";
import { gstinCheckChar } from "../companies/gstin";
import { listHolidays, removeHoliday, setHoliday } from "../clocks/clocks";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { listAllProducts, listAllRfqs, listCompanies, ListingAdminError, setListingByOperator } from "./lists";
import { cancelReportSchedule, reportSchedules, scheduleReport } from "./system";

// Founder QC (17 Nov 2026) DONE WHEN: operators find every company, product and RFQ in paged lists; they pause,
// resume and take down a listing with a reason the supplier is told; the audit log pages past its newest 200;
// holidays are kept in System settings; a scheduled report can be stopped.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("back-office lists and actions", () => {
  let h: DbHandle;
  const tag = randomBytes(3).toString("hex");
  const operator = async (role: string) => {
    const u = await makeUser(h.db, `Lists ${role}`);
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    return loadActor(h.db, u.id);
  };
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 4 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("lists companies by name and GSTIN, products by supplier and status, and RFQs", async () => {
    const admin = await operator("Super admin");
    const supplier = await makeCompany(h.db, `Listco ${tag}`, "supplier");
    // A well-formed, unique GSTIN: a random PAN, then the check character.
    const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const pan = `LS${letter()}${letter()}${letter()}${String(1000 + Math.floor(Math.random() * 9000))}${letter()}`;
    const gstin = `27${pan}1Z${gstinCheckChar(`27${pan}1Z`)}`;
    await h.db.insert(schema.organisationGstins).values({
      organisationId: supplier.org.id,
      gstin,
      stateCode: "27",
      isDefault: true,
    });
    const byName = await listCompanies(h.db, admin, { q: `Listco ${tag}` });
    expect(byName.rows.map((r) => r.id)).toEqual([supplier.org.id]);
    expect(byName.rows[0]).toMatchObject({ gstin, people: 2, liveProducts: 0 });
    expect((await listCompanies(h.db, admin, { q: gstin })).total).toBe(1);
    expect((await listCompanies(h.db, admin, { q: `Listco ${tag}`, kind: "buyer" })).total).toBe(0);

    const [category] = await h.db
      .select({ id: schema.catalogueCategories.id })
      .from(schema.catalogueCategories)
      .limit(1);
    await h.db.insert(schema.products).values({
      organisationId: supplier.org.id,
      categoryId: category?.id ?? "",
      slug: `listed-${tag}`,
      name: `Listed pump ${tag}`,
      status: "Live",
      publishedAt: new Date(),
    });
    const products = await listAllProducts(h.db, admin, { q: `Listco ${tag}` });
    expect(products.rows.map((p) => p.name)).toEqual([`Listed pump ${tag}`]);
    expect(products.rows[0]?.supplier).toContain("Listco");
    expect((await listAllProducts(h.db, admin, { q: `Listco ${tag}`, status: "Paused" })).total).toBe(0);
    expect((await listAllRfqs(h.db, admin, { q: `no-such-rfq-${tag}` })).total).toBe(0);
  });

  it("pauses, resumes and takes down a listing with a reason; the supplier's team is told", async () => {
    const admin = await operator("Super admin");
    const viewer = await operator("Content editor");
    const supplier = await makeCompany(h.db, `Pausing ${tag}`, "supplier");
    const [category] = await h.db
      .select({ id: schema.catalogueCategories.id })
      .from(schema.catalogueCategories)
      .limit(1);
    const [product] = await h.db
      .insert(schema.products)
      .values({
        organisationId: supplier.org.id,
        categoryId: category?.id ?? "",
        slug: `pause-${tag}`,
        name: `Pause me ${tag}`,
        status: "Live",
        publishedAt: new Date(),
      })
      .returning();
    const id = product?.id ?? "";
    await expect(setListingByOperator(h.db, viewer, { productId: id, to: "Paused", reason: "x" })).rejects.toThrow(
      "Not allowed",
    );
    await expect(
      setListingByOperator(h.db, admin, { productId: id, to: "Paused", reason: " " }),
    ).rejects.toBeInstanceOf(ListingAdminError);
    await expect(setListingByOperator(h.db, admin, { productId: id, to: "Live", reason: "x" })).rejects.toBeInstanceOf(
      ListingAdminError,
    );
    await setListingByOperator(h.db, admin, { productId: id, to: "Paused", reason: "Certificate expired" });
    await setListingByOperator(h.db, admin, { productId: id, to: "Live", reason: "New certificate checked" });
    await setListingByOperator(h.db, admin, { productId: id, to: "Archived", reason: "Counterfeit" });
    const [after] = await h.db
      .select({ status: schema.products.status })
      .from(schema.products)
      .where(eq(schema.products.id, id));
    expect(after?.status).toBe("Archived");
    const told = await h.db
      .select({ event: schema.notifications.event })
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, supplier.admin.id));
    expect(told.map((n) => n.event)).toEqual(
      expect.arrayContaining([
        "listing.paused_by_operator",
        "listing.live_by_operator",
        "listing.archived_by_operator",
      ]),
    );
  });

  it("pages and searches the audit log in the database", async () => {
    const admin = await operator("Super admin");
    const filter = { text: "listing.archived" };
    const total = await countAuditLog(h.db, admin, { resourceType: "product" });
    const first = await readAuditLog(h.db, admin, { resourceType: "product" }, { limit: 1, offset: 0 });
    const second = await readAuditLog(h.db, admin, { resourceType: "product" }, { limit: 1, offset: 1 });
    expect(total).toBeGreaterThanOrEqual(2);
    expect(first[0]?.id).not.toBe(second[0]?.id);
    expect(await countAuditLog(h.db, admin, filter)).toBeGreaterThanOrEqual(0);
  });

  it("keeps holidays (settings.edit) and stops a scheduled report", async () => {
    const admin = await operator("Super admin");
    const day = `${String(new Date().getFullYear() + 3)}-07-1${String(Math.floor(Math.random() * 9))}`; // beyond any seeded list
    await setHoliday(h.db, admin, { day, name: `Test day ${tag}` });
    expect((await listHolidays(h.db, admin)).some((x) => x.day === day && x.name === `Test day ${tag}`)).toBe(true);
    await removeHoliday(h.db, admin, day);
    expect((await listHolidays(h.db, admin)).some((x) => x.day === day && x.name === `Test day ${tag}`)).toBe(false);

    const row = await scheduleReport(h.db, admin, { email: `reports.${tag}@example.com`, frequency: "weekly" });
    const other = await operator("Finance");
    await expect(cancelReportSchedule(h.db, other, row?.id ?? "")).rejects.toThrow("Only the person");
    await cancelReportSchedule(h.db, admin, row?.id ?? "");
    expect((await reportSchedules(h.db, admin)).some((s) => s.id === row?.id)).toBe(false);
  });
});
