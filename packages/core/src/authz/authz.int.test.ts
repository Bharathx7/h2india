import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { approveJoinRequest, requestToJoin } from "../companies/join-requests";
import { changeMemberRole, getOrganisation, listInvitations, listMembers, renameOrganisation } from "../companies/repo";
import { listCompanyProducts } from "../products/company";
import { makeUser, twoCompanies, useTestEnv } from "../testing/factory";
import { loadActor } from "./actor";
import { can } from "./can";
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

    it("join requests", async () => {
      const asker = await makeUser(h.db, "Asker");
      const request = await requestToJoin({ userId: asker.id, organisationId: data.a.org.id });
      await expect(approveJoinRequest({ adminId: data.b.admin.id, requestId: request.id })).rejects.toMatchObject({
        code: "NOT_ALLOWED",
      });
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
