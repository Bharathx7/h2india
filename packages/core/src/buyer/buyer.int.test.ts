import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import { changeMemberRole } from "../companies/repo";
import { gstinCheckChar } from "../companies/gstin";
import { inviteMember, removeMember } from "../supplier/team";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { buyerChecklist } from "./checklist";
import {
  addToList,
  createList,
  listCards,
  ListError,
  listProductIds,
  projectLists,
  removeFromList,
  renameList,
} from "./lists";
import {
  addGstin,
  BuyerSettingsError,
  changeGstinByOperator,
  companyGstin,
  companySettings,
  deliverySitesOf,
  replaceGstin,
  saveApprovalRules,
  saveDeliverySite,
} from "./settings";

// Step 9.1 DONE WHEN: the checklist updates as steps finish; only a buyer Admin can invite, change roles or remove
// people (checked at the API, not only hidden); the company has one GSTIN (A189); and company B can't read or change
// company A's delivery sites, settings or lists.
const url = process.env.TEST_DATABASE_URL;
const tag = randomBytes(3).toString("hex");

/** A valid GSTIN for a random PAN, so runs on a shared test database never collide. */
function gstin(state: string, pan: string, entity = "1"): string {
  const first14 = `${state}${pan}${entity}Z`;
  return first14 + gstinCheckChar(first14);
}
const randomPan = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const pick = () => letters.charAt(randomBytes(1).readUInt8() % 26);
  return `AA${pick()}C${pick()}${String(1000 + (randomBytes(2).readUInt16BE() % 9000))}${pick()}`;
};

describe.skipIf(!url)("buyer workspace", () => {
  let h: DbHandle;
  let a: Awaited<ReturnType<typeof makeCompany>>;
  let b: Awaited<ReturnType<typeof makeCompany>>;
  const pan = randomPan();
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    a = await makeCompany(h.db, "Greenfield");
    b = await makeCompany(h.db, "Bravo");
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("the checklist follows the records", async () => {
    const admin = await loadActor(h.db, a.admin.id);
    let list = await buyerChecklist(h.db, a.org.id);
    expect(list.items.find((i) => i.key === "gstin")?.state).toBe("todo");
    expect(list.items.find((i) => i.key === "site")?.state).toBe("todo");
    expect(list.items.find((i) => i.key === "rules")?.state).toBe("todo");
    // makeCompany adds two people and an invitation.
    expect(list.items.find((i) => i.key === "colleagues")?.state).toBe("done");

    const first = await addGstin(h.db, admin, a.org.id, { gstin: gstin("27", pan), place: "Pune" });
    list = await buyerChecklist(h.db, a.org.id);
    expect(list.items.find((i) => i.key === "gstin")?.badge).toBe("Checking");
    await h.db
      .update(schema.organisationGstins)
      .set({ portalStatus: "Active", checkedAt: new Date() })
      .where(eq(schema.organisationGstins.id, first?.id ?? ""));
    await saveDeliverySite(h.db, admin, a.org.id, {
      name: "Talegaon plant",
      address: "Plot 14, Talegaon MIDC",
      city: "Pune",
      contacts: [{ name: "Suresh Patil", role: "Stores", mobile: "9876543210" }],
    });
    await saveApprovalRules(h.db, admin, a.org.id, {
      approvalAbovePaise: 100_000_000n,
      approverId: a.admin.id,
      secondApproval: false,
      secondAbovePaise: null,
      secondApproverId: null,
    });
    list = await buyerChecklist(h.db, a.org.id);
    expect(list.items.filter((i) => i.state === "done").map((i) => i.key)).toEqual([
      "gstin",
      "site",
      "colleagues",
      "rules",
    ]);
    expect(list.complete).toBe(false);
  });

  it("one GSTIN per company: no second one, replaced while being checked, locked once verified (A189)", async () => {
    const admin = await loadActor(h.db, a.admin.id);
    // The checklist test above added the company's GSTIN and marked it verified.
    await expect(addGstin(h.db, admin, a.org.id, { gstin: gstin("24", pan), place: "Kandla" })).rejects.toThrow(
      "A company has one GSTIN",
    );
    await expect(replaceGstin(h.db, admin, a.org.id, { gstin: gstin("24", pan) })).rejects.toThrow(
      "verified and locked",
    );

    // An operator without verification.edit can't change it; with it, a reason is needed and the old one is retired.
    const outsider = await loadActor(h.db, a.requester.id);
    await expect(
      changeGstinByOperator(h.db, outsider, a.org.id, { gstin: gstin("24", pan), reason: "Moved to Gujarat" }),
    ).rejects.toThrow("Not allowed");
    const operator = { ...admin, userId: a.admin.id, operator: new Set(["verification.edit"]) };
    await expect(
      changeGstinByOperator(h.db, operator, a.org.id, { gstin: gstin("24", pan), reason: " " }),
    ).rejects.toThrow("Say why");
    const before = await companyGstin(h.db, a.org.id);
    const changed = await changeGstinByOperator(h.db, operator, a.org.id, {
      gstin: gstin("24", pan),
      reason: "Registered office moved to Gujarat",
    });
    const settings = await companySettings(h.db, scopeFor(admin), a.org.id);
    expect(settings?.gstins.map((x) => x.id)).toEqual([changed?.id]);
    expect(settings?.gstins[0]?.portalStatus).toBe("Pending");
    const [old] = await h.db
      .select()
      .from(schema.organisationGstins)
      .where(eq(schema.organisationGstins.id, before?.id ?? ""));
    expect(old?.retiredAt).not.toBeNull();

    // While the new one is being checked, the company admin may correct it; the mistake is retired too.
    const fixed = await replaceGstin(h.db, admin, a.org.id, { gstin: gstin("08", pan), place: "Jaipur" });
    expect((await companyGstin(h.db, a.org.id))?.id).toBe(fixed?.id);
    // The database itself refuses a second live GSTIN.
    await expect(
      h.db
        .insert(schema.organisationGstins)
        .values({ organisationId: a.org.id, gstin: gstin("29", pan), stateCode: "29" }),
    ).rejects.toThrow();
    // A retired GSTIN can't simply come back; H2 Economy decides that.
    await expect(replaceGstin(h.db, admin, a.org.id, { gstin: gstin("24", pan) })).rejects.toBeInstanceOf(
      BuyerSettingsError,
    );
  });

  it("the last Admin can't make themselves anything else (founder QC, 17 Nov 2026)", async () => {
    const admin = await loadActor(h.db, a.admin.id);
    await expect(
      changeMemberRole(h.db, admin, { organisationId: a.org.id, userId: a.admin.id, role: "Requester" }),
    ).rejects.toThrow("at least one admin");
  });

  it("only a buyer Admin can invite, change roles or remove people", async () => {
    const requester = await loadActor(h.db, a.requester.id);
    const colleague = await makeUser(h.db, `Colleague ${tag}`);
    await expect(
      inviteMember(h.db, requester, a.org.id, { email: colleague.email, role: "Requester" }),
    ).rejects.toThrow();
    await expect(
      changeMemberRole(h.db, requester, { organisationId: a.org.id, userId: a.admin.id, role: "Requester" }),
    ).rejects.toThrow();
    await expect(removeMember(h.db, requester, a.org.id, a.admin.id)).rejects.toThrow();
    const admin = await loadActor(h.db, a.admin.id);
    await changeMemberRole(h.db, admin, {
      organisationId: a.org.id,
      userId: a.requester.id,
      role: "Approver",
      orderLimitPaise: 20_000_000n,
    });
    expect((await loadActor(h.db, a.requester.id)).companies.get(a.org.id)?.role).toBe("Approver");
    // B's admin can't change A's people.
    const bAdmin = await loadActor(h.db, b.admin.id);
    await expect(
      changeMemberRole(h.db, bAdmin, { organisationId: a.org.id, userId: a.requester.id, role: "Requester" }),
    ).rejects.toThrow();
  });

  it("company B can't read or change company A's sites, settings or lists", async () => {
    const aAdmin = await loadActor(h.db, a.admin.id);
    const bAdmin = await loadActor(h.db, b.admin.id);
    expect((await deliverySitesOf(h.db, scopeFor(aAdmin), a.org.id)).length).toBeGreaterThan(0);
    expect(await deliverySitesOf(h.db, scopeFor(bAdmin), a.org.id)).toEqual([]);
    expect(await companySettings(h.db, scopeFor(bAdmin), a.org.id)).toBeNull();
    await expect(
      saveDeliverySite(h.db, bAdmin, a.org.id, { name: "Fake", address: "Somewhere", contacts: [] }),
    ).rejects.toThrow();

    const list = await createList(h.db, aAdmin, a.org.id, "Talegaon pilot");
    expect((await projectLists(h.db, scopeFor(bAdmin), a.org.id)).length).toBe(0);
    expect(await listProductIds(h.db, scopeFor(bAdmin), a.org.id, list?.id ?? "")).toEqual([]);
    await expect(createList(h.db, bAdmin, a.org.id, "Sneaky")).rejects.toBeInstanceOf(ListError);
    await expect(removeFromList(h.db, bAdmin, a.org.id, list?.id ?? "", [])).rejects.toBeInstanceOf(ListError);
    // Founder QC (17 Nov 2026): rename. Company B can't rename A's list, even by naming A's list in its own company.
    await expect(renameList(h.db, bAdmin, a.org.id, list?.id ?? "", "Taken")).rejects.toBeInstanceOf(ListError);
    await expect(renameList(h.db, bAdmin, b.org.id, list?.id ?? "", "Taken")).rejects.toThrow("No such list");
    await renameList(h.db, aAdmin, a.org.id, list?.id ?? "", "Talegaon pilot, phase 2");
    expect((await projectLists(h.db, scopeFor(aAdmin), a.org.id)).map((l) => l.name)).toContain(
      "Talegaon pilot, phase 2",
    );
  });

  it("a list holds products as cards, without a price", async () => {
    const supplier = await makeCompany(h.db, `List supplier ${tag}`, "supplier");
    await h.db
      .insert(schema.companyProfiles)
      .values({ organisationId: supplier.org.id, slug: `list-supplier-${tag}`, tradeName: "Pranava H2" });
    const [category] = await h.db
      .insert(schema.catalogueCategories)
      .values({ classId: "equipment", slug: `list-tanks-${tag}`, label: "Tanks" })
      .returning();
    const [product] = await h.db
      .insert(schema.products)
      .values({
        organisationId: supplier.org.id,
        categoryId: category?.id ?? "",
        status: "Live",
        publishedAt: new Date(),
        slug: `list-tank-${tag}`,
        name: "Type IV cylinder",
        leadTimeMinWeeks: 6,
        leadTimeMaxWeeks: 8,
      })
      .returning();
    const admin = await loadActor(h.db, a.admin.id);
    const list = await createList(h.db, admin, a.org.id, "Storage options");
    await addToList(h.db, admin, a.org.id, list?.id ?? "", product?.id ?? "");
    const cards = await listCards(h.db, scopeFor(admin), a.org.id, list?.id ?? "");
    expect(cards.map((c) => c.name)).toEqual(["Type IV cylinder"]);
    expect(cards[0]?.leadTime).toBe("6–8 weeks");
    expect(JSON.stringify(cards)).not.toMatch(/price|paise/i);
    // The chip count on 78:2628 counts the list's own products.
    expect((await projectLists(h.db, scopeFor(admin), a.org.id)).find((l) => l.id === list?.id)?.count).toBe(1);
  });
});
