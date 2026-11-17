import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { approveJoinRequest, requestToJoin } from "../companies/join-requests";
import { changeMemberRole, getOrganisation, listInvitations, listMembers, renameOrganisation } from "../companies/repo";
import { pendingClaims } from "../companies/claims";
import { createList, projectLists } from "../buyer/lists";
import { addDelegation, delegationsOf, deliverySitesOf, saveDeliverySite } from "../buyer/settings";
import { listCompanyProducts, listCompanyQuestions } from "../products/company";
import { cancelOrder, listOrders, orderDetail } from "../orders";
import { insertOrder } from "../orders/records";
import { makeUser, twoCompanies, useTestEnv } from "../testing/factory";
import { loadActor } from "./actor";
import { can } from "./can";
import { roleGrid, setRolePermission } from "./company-roles";
import { scopeFor } from "./scope";

// Step 3.4: company B can never read or change company A's records. Add every new company-owned record type here.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("authorisation", () => {
  let h: DbHandle;
  let data: Awaited<ReturnType<typeof twoCompanies>>;
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    data = await twoCompanies(h.db);
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("lets a company read its own organisation, members and invitations", async () => {
    const scope = scopeFor(await loadActor(h.db, data.a.admin.id));
    expect((await getOrganisation(h.db, scope, data.a.org.id))?.id).toBe(data.a.org.id);
    expect(await listMembers(h.db, scope, data.a.org.id)).toHaveLength(2);
    expect(await listInvitations(h.db, scope, data.a.org.id)).toHaveLength(1);
  });

  describe("company B cannot read or change company A's records", () => {
    it("organisations", async () => {
      const b = await loadActor(h.db, data.b.admin.id);
      expect(await getOrganisation(h.db, scopeFor(b), data.a.org.id)).toBeNull();
      await expect(renameOrganisation(h.db, b, data.a.org.id, "Taken over")).rejects.toThrow("Not allowed");
      const [a] = await h.db.select().from(schema.organisations).where(eq(schema.organisations.id, data.a.org.id));
      expect(a?.legalName).toBe("Alpha Test Company");
    });

    it("memberships", async () => {
      const b = await loadActor(h.db, data.b.admin.id);
      expect(await listMembers(h.db, scopeFor(b), data.a.org.id)).toEqual([]);
      await expect(
        changeMemberRole(h.db, b, { organisationId: data.a.org.id, userId: data.a.requester.id, role: "Admin" }),
      ).rejects.toThrow("Not allowed");
    });

    it("role permissions (founder QC, 17 Nov 2026)", async () => {
      const b = await loadActor(h.db, data.b.admin.id);
      await expect(
        setRolePermission(h.db, b, {
          organisationId: data.a.org.id,
          role: "Requester",
          permission: "order.approve",
          on: true,
        }),
      ).rejects.toThrow("Not allowed");
      await expect(roleGrid(h.db, b, data.a.org.id)).rejects.toThrow("Not allowed");
    });

    it("invitations", async () => {
      const b = await loadActor(h.db, data.b.admin.id);
      expect(await listInvitations(h.db, scopeFor(b), data.a.org.id)).toEqual([]);
    });

    it("products (step 6.3)", async () => {
      const [category] = await h.db.select().from(schema.catalogueCategories).limit(1);
      await h.db.insert(schema.products).values({
        organisationId: data.a.org.id,
        categoryId: category?.id ?? "",
        slug: `alpha-draft-${String(Date.now())}`,
        name: "Alpha draft product",
      });
      const a = await loadActor(h.db, data.a.admin.id);
      const b = await loadActor(h.db, data.b.admin.id);
      expect((await listCompanyProducts(h.db, scopeFor(a), data.a.org.id)).map((p) => p.name)).toContain(
        "Alpha draft product",
      );
      expect(await listCompanyProducts(h.db, scopeFor(b), data.a.org.id)).toEqual([]);
    });

    it("product questions (step 6.4)", async () => {
      const [product] = await h.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.organisationId, data.a.org.id))
        .limit(1);
      await h.db.insert(schema.productQuestions).values({
        productId: product?.id ?? "",
        organisationId: data.a.org.id,
        askerId: data.b.requester.id,
        question: "Can it run at 30% load for long periods?",
      });
      const a = await loadActor(h.db, data.a.admin.id);
      const b = await loadActor(h.db, data.b.admin.id);
      expect(await listCompanyQuestions(h.db, scopeFor(a), data.a.org.id)).toHaveLength(1);
      expect(await listCompanyQuestions(h.db, scopeFor(b), data.a.org.id)).toEqual([]);
    });

    it("profile claims (step 6.7): only operators see them", async () => {
      const b = await loadActor(h.db, data.b.admin.id);
      await expect(pendingClaims(h.db, b)).rejects.toThrow("Not allowed");
    });

    it("join requests", async () => {
      const asker = await makeUser(h.db, "Asker");
      const request = await requestToJoin({ userId: asker.id, organisationId: data.a.org.id });
      await expect(approveJoinRequest({ adminId: data.b.admin.id, requestId: request.id })).rejects.toMatchObject({
        code: "NOT_ALLOWED",
      });
    });

    it("delivery sites, delegations and project lists (step 9.1)", async () => {
      const a = await loadActor(h.db, data.a.admin.id);
      const b = await loadActor(h.db, data.b.admin.id);
      await saveDeliverySite(h.db, a, data.a.org.id, { name: "Plant", address: "Plot 1", contacts: [] });
      await addDelegation(h.db, a, data.a.org.id, {
        fromUserId: data.a.admin.id,
        toUserId: data.a.requester.id,
        startsOn: new Date(),
        endsOn: new Date(Date.now() + 7 * 86_400_000),
      });
      await createList(h.db, a, data.a.org.id, "Pilot");
      expect(await deliverySitesOf(h.db, scopeFor(b), data.a.org.id)).toEqual([]);
      expect(await delegationsOf(h.db, scopeFor(b), data.a.org.id)).toEqual([]);
      expect(await projectLists(h.db, scopeFor(b), data.a.org.id)).toEqual([]);
      await expect(
        saveDeliverySite(h.db, b, data.a.org.id, { name: "X", address: "Y", contacts: [] }),
      ).rejects.toThrow();
      await expect(createList(h.db, b, data.a.org.id, "X")).rejects.toThrow();
    });

    it("orders, their money and documents (step 10.1)", async () => {
      const b = await loadActor(h.db, data.b.admin.id);
      const supplier = await makeUser(h.db, "Authz supplier");
      const [org] = await h.db
        .insert(schema.organisations)
        .values({ kind: "supplier", legalName: "Authz supplier" })
        .returning();
      if (!org) throw new Error("no supplier");
      await h.db.insert(schema.memberships).values({ organisationId: org.id, userId: supplier.id, role: "Admin" });
      const order = await h.db.transaction((tx) =>
        insertOrder(tx, {
          buyerOrganisationId: data.a.org.id,
          supplierOrganisationId: org.id,
          placedBy: data.a.admin.id,
          source: "cart",
          paymentMethod: "bank_transfer",
          lines: [{ description: "Valve", quantity: 1, unitPricePaise: 100_00n, gstRateBps: 1800 }],
          schedule: [],
          needsApproval: false,
        }),
      );
      expect(await orderDetail(scopeFor(b), h.db, order.id)).toBeNull();
      expect(await listOrders(scopeFor(b), h.db, { organisationId: data.a.org.id, side: "buyer" })).toEqual([]);
      await expect(
        cancelOrder(h.db, b, data.a.org.id, order.id, "Not mine", undefined, { flags: { FLAG_TRANSACTIONS: "true" } }),
      ).rejects.toThrow();
      // The two sides of the order can read it.
      const a = await loadActor(h.db, data.a.admin.id);
      expect((await orderDetail(scopeFor(a), h.db, order.id))?.side).toBe("buyer");
      expect((await orderDetail(scopeFor(await loadActor(h.db, supplier.id)), h.db, order.id))?.side).toBe("supplier");
    });
  });

  it("follows roles inside a company: a Requester cannot manage the team", async () => {
    const requester = await loadActor(h.db, data.a.requester.id);
    expect(can(requester, "rfq.create", { organisationId: data.a.org.id })).toBe(true);
    expect(can(requester, "team.manage", { organisationId: data.a.org.id })).toBe(false);
    await expect(
      changeMemberRole(h.db, requester, { organisationId: data.a.org.id, userId: data.a.admin.id, role: "Requester" }),
    ).rejects.toThrow("Not allowed");
  });

  it("applies a company's own permission ticks at once, never to Admin or for admin-only permissions", async () => {
    const admin = await loadActor(h.db, data.a.admin.id);
    const before = await loadActor(h.db, data.a.requester.id);
    expect(can(before, "order.approve", { organisationId: data.a.org.id })).toBe(false);
    await setRolePermission(h.db, admin, {
      organisationId: data.a.org.id,
      role: "Requester",
      permission: "order.approve",
      on: true,
    });
    const after = await loadActor(h.db, data.a.requester.id);
    expect(can(after, "order.approve", { organisationId: data.a.org.id })).toBe(true);
    // Company B's Requesters are untouched.
    const other = await loadActor(h.db, data.b.requester.id);
    expect(can(other, "order.approve", { organisationId: data.b.org.id })).toBe(false);
    await expect(
      setRolePermission(h.db, admin, {
        organisationId: data.a.org.id,
        role: "Admin",
        permission: "rfq.view",
        on: false,
      }),
    ).rejects.toThrow("Admins can always do everything");
    await expect(
      setRolePermission(h.db, admin, {
        organisationId: data.a.org.id,
        role: "Requester",
        permission: "team.manage",
        on: true,
      }),
    ).rejects.toThrow("Only an admin");
    // Back to the default: the company's change is removed.
    await setRolePermission(h.db, admin, {
      organisationId: data.a.org.id,
      role: "Requester",
      permission: "order.approve",
      on: false,
    });
    const reset = await h.db
      .select()
      .from(schema.companyRolePermissions)
      .where(eq(schema.companyRolePermissions.organisationId, data.a.org.id));
    expect(reset).toEqual([]);
  });

  it("applies a role change made in the database at once, without a deploy", async () => {
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "buyer"), eq(schema.roles.name, "Requester")));
    if (!role) throw new Error("Requester role missing");
    const where = and(
      eq(schema.rolePermissions.roleId, role.id),
      eq(schema.rolePermissions.permissionKey, "rfq.create"),
    );
    try {
      await h.db.delete(schema.rolePermissions).where(where);
      expect(can(await loadActor(h.db, data.a.requester.id), "rfq.create", { organisationId: data.a.org.id })).toBe(
        false,
      );
    } finally {
      await h.db
        .insert(schema.rolePermissions)
        .values({ roleId: role.id, permissionKey: "rfq.create" })
        .onConflictDoNothing();
    }
    expect(can(await loadActor(h.db, data.a.requester.id), "rfq.create", { organisationId: data.a.org.id })).toBe(true);
  });

  it("gives operators their area permissions and lets them read every company only in that area", async () => {
    const finance = await makeUser(h.db, "Finance Operator");
    const [role] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Finance")));
    if (!role) throw new Error("Finance role missing");
    await h.db.insert(schema.operatorRoles).values({ userId: finance.id, roleId: role.id });
    const actor = await loadActor(h.db, finance.id);
    expect(actor.platform.has("operator")).toBe(true);
    expect(can(actor, "money.edit")).toBe(true);
    expect(can(actor, "orders.edit")).toBe(false); // as drawn: sees orders, can't change them
    expect(can(actor, "settings.view")).toBe(false);
    expect(await getOrganisation(h.db, scopeFor(actor, { operatorArea: "users" }), data.a.org.id)).not.toBeNull();
    expect(await getOrganisation(h.db, scopeFor(actor, { operatorArea: "settings" }), data.a.org.id)).toBeNull();
  });

  it("refuses everything to a visitor", async () => {
    const visitor = await loadActor(h.db, null);
    expect(can(visitor, "company.view", { organisationId: data.a.org.id })).toBe(false);
    expect(await getOrganisation(h.db, scopeFor(visitor), data.a.org.id)).toBeNull();
  });
});
