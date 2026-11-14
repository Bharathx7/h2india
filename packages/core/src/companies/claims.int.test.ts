import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { makeUser, useTestEnv } from "../testing/factory";
import {
  claimTarget,
  decideClaim,
  domainOf,
  emailMatchesDomain,
  myClaim,
  pendingClaims,
  startEmailClaim,
  submitGstinClaim,
} from "./claims";

// Step 6.7 DONE WHEN: a profile already claimed can't be claimed again (the person is offered a join request); every
// approval needs an operator; company-email codes must match the company's domain.
const url = process.env.TEST_DATABASE_URL;

describe("claim rules", () => {
  it("reads the company's domain from its website and checks emails against it", () => {
    expect(domainOf("https://www.shaktifuelcells.in/about")).toBe("shaktifuelcells.in");
    expect(domainOf("shaktifuelcells.in")).toBe("shaktifuelcells.in");
    expect(domainOf("")).toBeNull();
    expect(emailMatchesDomain("meera@shaktifuelcells.in", "shaktifuelcells.in")).toBe(true);
    expect(emailMatchesDomain("meera@sales.shaktifuelcells.in", "shaktifuelcells.in")).toBe(true);
    expect(emailMatchesDomain("meera@gmail.com", "shaktifuelcells.in")).toBe(false);
    expect(emailMatchesDomain("meera@fakeshaktifuelcells.in", "shaktifuelcells.in")).toBe(false);
  });
});

describe.skipIf(!url)("claim this profile", () => {
  let h: DbHandle;
  const tag = randomBytes(3).toString("hex");
  let orgId = "";

  const operator = async (role: string) => {
    const u = await makeUser(h.db, `Claims ${role}`);
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db.insert(schema.operatorRoles).values({ userId: u.id, roleId: r?.id ?? "" });
    return loadActor(h.db, u.id);
  };

  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
    const [org] = await h.db
      .insert(schema.organisations)
      .values({ kind: "supplier", legalName: `Shakti ${tag}` })
      .returning();
    orgId = org?.id ?? "";
    await h.db.insert(schema.companyProfiles).values({
      organisationId: orgId,
      slug: `shakti-${tag}`,
      tradeName: "Shakti Fuel Cells",
      website: "https://shaktifuelcells.in",
      claimStatus: "Unclaimed",
    });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("refuses a company-email claim from another domain", async () => {
    const someone = await makeUser(h.db, "Claimer");
    await expect(
      startEmailClaim(h.db, { slug: `shakti-${tag}`, userId: someone.id, email: "me@gmail.com" }),
    ).rejects.toThrow("Use an email address on shaktifuelcells.in");
  });

  it("sends a GSTIN claim to an operator, who alone can approve it, and the claimant becomes an Admin", async () => {
    const claimer = await makeUser(h.db, "Rightful");
    const rival = await makeUser(h.db, "Rival");
    await expect(
      submitGstinClaim(h.db, { slug: `shakti-${tag}`, userId: claimer.id, gstin: "bad", letterFileId: "f" }),
    ).rejects.toThrow("15-character GSTIN");
    const { claimId } = await submitGstinClaim(h.db, {
      slug: `shakti-${tag}`,
      userId: claimer.id,
      gstin: "33AABCS1234M1Z5",
      letterFileId: "file-1",
    });
    await submitGstinClaim(h.db, {
      slug: `shakti-${tag}`,
      userId: rival.id,
      gstin: "33AABCS1234M1Z5",
      letterFileId: "file-2",
    });

    const editor = await operator("Content editor");
    await expect(decideClaim(h.db, editor, { claimId, approve: true })).rejects.toThrow("Not allowed");
    await expect(pendingClaims(h.db, editor)).rejects.toThrow("Not allowed");

    const verifier = await operator("Supplier verifier");
    expect((await pendingClaims(h.db, verifier)).filter((r) => r.slug === `shakti-${tag}`)).toHaveLength(2);
    await decideClaim(h.db, verifier, { claimId, approve: true });

    expect((await claimTarget(h.db, `shakti-${tag}`))?.claimed).toBe(true);
    const [member] = await h.db
      .select()
      .from(schema.memberships)
      .where(and(eq(schema.memberships.organisationId, orgId), eq(schema.memberships.userId, claimer.id)));
    expect(member?.role).toBe("Admin");
    // The rival's claim is closed, and nobody can claim it again: they're offered a join request instead.
    expect((await myClaim(h.db, rival.id, orgId))?.status).toBe("Rejected");
    const late = await makeUser(h.db, "Late");
    await expect(
      submitGstinClaim(h.db, { slug: `shakti-${tag}`, userId: late.id, gstin: "33AABCS1234M1Z5", letterFileId: "f" }),
    ).rejects.toThrow("already been claimed");
  });

  it("needs a reason to reject", async () => {
    const [org] = await h.db
      .insert(schema.organisations)
      .values({ kind: "supplier", legalName: `Other ${tag}` })
      .returning();
    await h.db
      .insert(schema.companyProfiles)
      .values({ organisationId: org?.id ?? "", slug: `other-${tag}`, tradeName: "Other", claimStatus: "Unclaimed" });
    const u = await makeUser(h.db, "Unsure");
    const { claimId } = await submitGstinClaim(h.db, {
      slug: `other-${tag}`,
      userId: u.id,
      gstin: "33AABCS1234M1Z5",
      letterFileId: "f",
    });
    const verifier = await operator("Supplier verifier");
    await expect(decideClaim(h.db, verifier, { claimId, approve: false })).rejects.toThrow("Say why");
    await decideClaim(h.db, verifier, { claimId, approve: false, reason: "The letter isn't signed by a director." });
    expect(await myClaim(h.db, u.id, org?.id ?? "")).toMatchObject({
      status: "Rejected",
      reason: "The letter isn't signed by a director.",
    });
  });
});
