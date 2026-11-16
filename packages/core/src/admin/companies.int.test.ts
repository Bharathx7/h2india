import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor, type Actor } from "../authz/actor";
import { gstinCheckChar } from "../companies/gstin";
import { acceptInvitation, sendInvitation } from "../supplier/team";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { addSupplierByOperator, companyDetail } from "./companies";

// Admin QC (16 Nov 2026): Company detail and Add a supplier, against PostgreSQL with the fake GSTIN provider.
const url = process.env.TEST_DATABASE_URL;

/** A fresh GSTIN in the fake's active test family (PAN AAKCT + 4 digits + letter). */
function testGstin(): string {
  const pan = `AAKCT${String(1000 + Math.floor(Math.random() * 8999))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
  const first14 = `27${pan}1Z`;
  return first14 + gstinCheckChar(first14);
}

describe.skipIf(!url)("admin companies", () => {
  let h: DbHandle;
  let admin: Actor;
  let adminId: string;
  let editor: Actor;
  async function op(role: string) {
    const u = await makeUser(h.db, `${role} QC`);
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    return { id: u.id, actor: await loadActor(h.db, u.id) };
  }
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    const a = await op("Super admin");
    admin = a.actor;
    adminId = a.id;
    editor = (await op("Content editor")).actor;
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("a Super admin adds a supplier: created as Join does, not a member, owner invited as Admin, not Verified", async () => {
    const gstin = testGstin();
    const owner = `owner-${String(Date.now())}@example.com`;
    // Only users.edit may add a company.
    await expect(addSupplierByOperator(h.db, editor, { gstin, ownerEmail: owner })).rejects.toThrow("Not allowed");
    const made = await addSupplierByOperator(h.db, admin, { gstin, ownerEmail: owner });
    const [org] = await h.db
      .select()
      .from(schema.organisations)
      .where(eq(schema.organisations.id, made.organisationId));
    expect(org).toMatchObject({ kind: "supplier", createdBy: adminId });
    expect(org?.verification).not.toBe("Verified");
    const members = await h.db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.organisationId, made.organisationId));
    expect(members).toEqual([]);
    const [invite] = await h.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.organisationId, made.organisationId));
    expect(invite).toMatchObject({ email: owner, role: "Admin", invitedBy: adminId });
    const [logged] = await h.db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.resourceId, made.organisationId),
          eq(schema.auditLog.action, "organisation.create_by_operator"),
        ),
      );
    expect(logged?.actorId).toBe(adminId);

    // The same GSTIN again is refused, pointing at the company that has it.
    await expect(addSupplierByOperator(h.db, admin, { gstin, ownerEmail: owner })).rejects.toMatchObject({
      existingId: made.organisationId,
    });

    // Company detail shows the GSTIN and the open invitation; a Content editor can't open it.
    const d = await companyDetail(h.db, admin, made.organisationId);
    expect(d?.gstins.map((g) => g.gstin)).toEqual([gstin]);
    expect(d?.invitations.map((i) => i.email)).toEqual([owner]);
    await expect(companyDetail(h.db, editor, made.organisationId)).rejects.toThrow("Not allowed");
  });

  it("an owner with no account yet accepts and becomes the supplier Admin", async () => {
    const owner = await makeUser(h.db, "New Owner");
    await h.db.update(schema.users).set({ profileType: null }).where(eq(schema.users.id, owner.id));
    const [person] = await h.db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, owner.id));
    const made = await addSupplierByOperator(h.db, admin, { gstin: testGstin(), ownerEmail: person?.email ?? "" });
    // A second invitation gives the test a token it can use (tokens are stored hashed).
    await h.db.delete(schema.invitations).where(eq(schema.invitations.organisationId, made.organisationId));
    const { token } = await sendInvitation(h.db, {
      organisationId: made.organisationId,
      email: person?.email ?? "",
      role: "Admin",
      invitedBy: adminId,
      inviterRole: "H2 Economy team",
    });
    // Someone who never went through Join agrees to the Terms when accepting.
    await expect(acceptInvitation(h.db, owner.id, token)).rejects.toThrow("Terms");
    await acceptInvitation(h.db, owner.id, token, undefined, undefined, { termsVersion: "test" });
    const [member] = await h.db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.organisationId, made.organisationId));
    expect(member).toMatchObject({ userId: owner.id, role: "Admin" });
    const [after] = await h.db
      .select({ profileType: schema.users.profileType, termsVersion: schema.users.termsVersion })
      .from(schema.users)
      .where(eq(schema.users.id, owner.id));
    expect(after).toMatchObject({ profileType: "supplier", termsVersion: "test" });
  });

  it("company detail is for operators only: a company's own admin can't open it", async () => {
    const c = await makeCompany(h.db, "Detail", "supplier");
    await expect(companyDetail(h.db, await loadActor(h.db, c.admin.id), c.org.id)).rejects.toThrow("Not allowed");
    expect((await companyDetail(h.db, admin, c.org.id))?.team.map((t) => t.userId)).toContain(c.admin.id);
  });
});
