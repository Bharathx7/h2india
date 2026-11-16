import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import { companyProfile } from "../companies/claims";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import {
  decideStorefront,
  publishStorefront,
  saveStorefrontDraft,
  storefrontQueue,
  storefrontView,
} from "./storefront";
import { acceptInvitation, invitationFor, inviteMember, removeMember, TeamError, teamView } from "./team";

// Step 8.7 DONE WHEN: an invited colleague joins with the chosen permissions; a storefront change appears on the public
// profile after approval. And supplier B can't read or change supplier A's team or storefront. Mailpit for the email.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("team and storefront", () => {
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

  it("an invited colleague joins with the chosen role; only that email can accept", async () => {
    const admin = await loadActor(h.db, a.admin.id);
    const colleague = await makeUser(h.db, "Sanjay Pillai");
    const stranger = await makeUser(h.db, "Stranger");
    await expect(inviteMember(h.db, admin, a.org.id, { email: colleague.email, role: "Owner" })).rejects.toBeInstanceOf(
      TeamError,
    );
    const { token } = await inviteMember(h.db, admin, a.org.id, { email: colleague.email, role: "Catalogue" });
    expect((await invitationFor(h.db, token))?.state).toBe("open");
    await expect(acceptInvitation(h.db, stranger.id, token)).rejects.toThrow(colleague.email);
    await acceptInvitation(h.db, colleague.id, token, undefined, undefined, { termsVersion: "test" });
    const actor = await loadActor(h.db, colleague.id);
    expect(actor.companies.get(a.org.id)?.role).toBe("Catalogue");
    expect(actor.companies.get(a.org.id)?.permissions.has("product.manage")).toBe(true);
    expect(actor.companies.get(a.org.id)?.permissions.has("payout_bank.change")).toBe(false);
    await expect(acceptInvitation(h.db, colleague.id, token)).rejects.toThrow("can't be used");
    // An expired invitation can't be used.
    const late = await inviteMember(
      h.db,
      admin,
      a.org.id,
      { email: stranger.email, role: "Viewer" },
      new Date(Date.now() - 30 * 86_400_000),
    );
    expect((await invitationFor(h.db, late.token))?.state).toBe("expired");
  });

  it("keeps at least one admin, and removes others", async () => {
    const admin = await loadActor(h.db, a.admin.id);
    await expect(removeMember(h.db, admin, a.org.id, a.admin.id)).rejects.toThrow("at least one admin");
    await removeMember(h.db, admin, a.org.id, a.requester.id);
    expect((await teamView(h.db, scopeFor(admin), a.org.id)).members.some((m) => m.userId === a.requester.id)).toBe(
      false,
    );
  });

  it("a storefront change reaches the public profile only after approval", async () => {
    const admin = await loadActor(h.db, a.admin.id);
    await saveStorefrontDraft(h.db, admin, a.org.id, {
      about: "Diaphragm compressors made in Chennai.",
      capabilities: "Helium leak testing to 700 bar",
      categories: ["Diaphragm compressors"],
    });
    const view = await storefrontView(h.db, scopeFor(admin), a.org.id);
    expect(view.profile).not.toBeNull();
    expect(view.open?.status).toBe("Draft");
    let profile = await companyProfile(h.db, view.profile?.slug ?? "", { includeSample: true });
    expect(profile?.summary).toBeNull();
    await publishStorefront(h.db, admin, a.org.id);
    const op = await makeUser(h.db, "Moderator");
    await h.db.execute(
      sql`insert into core.operator_roles (user_id, role_id) select ${op.id}, id from core.roles where scope = 'operator' and name = 'Catalogue moderator'`,
    );
    const opActor = await loadActor(h.db, op.id);
    const queued = (await storefrontQueue(h.db, opActor)).find((q) => q.r.organisationId === a.org.id);
    expect(queued).toBeTruthy();
    await decideStorefront(h.db, opActor, { id: queued?.r.id ?? "", approve: true });
    profile = await companyProfile(h.db, view.profile?.slug ?? "", { includeSample: true });
    expect(profile).toMatchObject({
      summary: "Diaphragm compressors made in Chennai.",
      categories: ["Diaphragm compressors"],
    });
    expect(profile?.storefront.capabilities).toBe("Helium leak testing to 700 bar");
  });

  it("supplier B can't see or change supplier A's team or storefront", async () => {
    const bActor = await loadActor(h.db, b.admin.id);
    const t = await teamView(h.db, scopeFor(bActor), a.org.id);
    expect(t.members).toEqual([]);
    await expect(inviteMember(h.db, bActor, a.org.id, { email: "x@example.com", role: "Viewer" })).rejects.toThrow();
    await expect(saveStorefrontDraft(h.db, bActor, a.org.id, { about: "Taken" })).rejects.toThrow();
    expect((await storefrontView(h.db, scopeFor(bActor), a.org.id)).profile).toBeNull();
    const memberships = await h.db
      .select()
      .from(schema.memberships)
      .where(and(eq(schema.memberships.organisationId, a.org.id), eq(schema.memberships.userId, b.admin.id)));
    expect(memberships).toEqual([]);
  });
});
