import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { acceptInvitation, inviteMember, teamView } from "../supplier/team";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import { loadActor } from "./actor";
import { can } from "./can";
import { MemberAccessError, setMemberAccess } from "./member-access";
import { scopeFor } from "./scope";

// Founder QC (17 Nov 2026) DONE WHEN: an admin ticks what each member may do; the ticks are what the member can do;
// an invitation carries them; the company always keeps an admin; another company can't change them.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("member access", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 4 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("a member's own ticks are what they can do; Admin stays whole; the last admin stays", async () => {
    const a = await makeCompany(h.db, "Access A", "supplier");
    const admin = await loadActor(h.db, a.admin.id);
    const orgId = a.org.id;
    await setMemberAccess(h.db, admin, {
      organisationId: orgId,
      userId: a.requester.id,
      access: { admin: false, permissions: ["company.view", "rfq.view", "storefront.manage"] },
    });
    const member = await loadActor(h.db, a.requester.id);
    expect(can(member, "storefront.manage", { organisationId: orgId })).toBe(true);
    expect(can(member, "quote.send", { organisationId: orgId })).toBe(false);
    expect(can(member, "team.manage", { organisationId: orgId })).toBe(false);
    const view = await teamView(h.db, scopeFor(admin), orgId);
    expect(view.members.find((x) => x.userId === a.requester.id)).toMatchObject({ role: "Custom", admin: false });

    // The only admin can't give up full access.
    await expect(
      setMemberAccess(h.db, admin, {
        organisationId: orgId,
        userId: a.admin.id,
        access: { admin: false, permissions: ["company.view"] },
      }),
    ).rejects.toBeInstanceOf(MemberAccessError);

    // Full access again: Admin with no own list.
    await setMemberAccess(h.db, admin, {
      organisationId: orgId,
      userId: a.requester.id,
      access: { admin: true, permissions: [] },
    });
    const [seat] = await h.db
      .select({ role: schema.memberships.role, permissions: schema.memberships.permissions })
      .from(schema.memberships)
      .where(and(eq(schema.memberships.organisationId, orgId), eq(schema.memberships.userId, a.requester.id)));
    expect(seat).toEqual({ role: "Admin", permissions: null });
  });

  it("another company's admin can't change the access", async () => {
    const a = await makeCompany(h.db, "Access B", "supplier");
    const b = await makeCompany(h.db, "Access C", "supplier");
    const outsider = await loadActor(h.db, b.admin.id);
    await expect(
      setMemberAccess(h.db, outsider, {
        organisationId: a.org.id,
        userId: a.requester.id,
        access: { admin: false, permissions: ["company.view"] },
      }),
    ).rejects.toThrow("Not allowed");
  });

  it("an invitation carries the ticked access to the new member", async () => {
    const a = await makeCompany(h.db, "Access D", "supplier");
    const admin = await loadActor(h.db, a.admin.id);
    const person = await makeUser(h.db, "Invited Access");
    await h.db.update(schema.users).set({ termsAcceptedAt: new Date() }).where(eq(schema.users.id, person.id));
    const { token } = await inviteMember(h.db, admin, a.org.id, {
      email: person.email,
      access: { admin: false, permissions: ["company.view", "product.manage"] },
    });
    await acceptInvitation(h.db, person.id, token);
    const joined = await loadActor(h.db, person.id);
    expect(can(joined, "product.manage", { organisationId: a.org.id })).toBe(true);
    expect(can(joined, "quote.send", { organisationId: a.org.id })).toBe(false);
  });
});
