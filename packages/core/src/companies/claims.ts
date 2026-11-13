import { schema, type Database, type Executor, type StorefrontData } from "@h2india/db";
import { and, desc, eq } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { checkCode, RecoveryCodeError, sendCode } from "../recovery/codes";
import { changeStatus } from "../status";

// Claim this profile (step 6.7; 492:5615 to 494:427). A person claims a pre-seeded (Unclaimed) company profile:
//   - by a code sent to an email on the company's own domain (the profile's website), or
//   - by GSTIN and an authorisation letter signed by a director.
// Every claim is then approved by an operator (A137, playbook watch-out). Approval makes the claimant an Admin of the
// company and the profile Claimed, keeping the profile and its history; a claimed profile can't be claimed again and
// the person is offered a join request instead.

const c = schema.companyClaims;
const p = schema.companyProfiles;

export const CLAIM_TRANSITIONS = {
  Started: ["Pending"],
  Pending: ["Approved", "Rejected"],
  Approved: [],
  Rejected: [],
} as const;

export class ClaimError extends Error {
  constructor(
    message: string,
    readonly field: string = "_",
  ) {
    super(message);
    this.name = "ClaimError";
  }
}

/** "shaktifuelcells.in" from "https://www.shaktifuelcells.in/about". */
export function domainOf(website: string | null): string | null {
  if (!website?.trim()) return null;
  try {
    const host = new URL(website.includes("://") ? website : `https://${website}`).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** The email is on the company's domain (or one of its sub-domains). */
export function emailMatchesDomain(email: string, domain: string): boolean {
  const at = email.trim().toLowerCase().split("@");
  if (at.length !== 2 || !at[0]) return false;
  const host = at[1] ?? "";
  return host === domain || host.endsWith(`.${domain}`);
}

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export interface ClaimTarget {
  organisationId: string;
  slug: string;
  name: string;
  claimed: boolean;
  domain: string | null;
  place: string;
  type: string | null;
}

export async function claimTarget(db: Executor, slug: string): Promise<ClaimTarget | null> {
  const [row] = await db
    .select({ p, state: schema.organisations.state })
    .from(p)
    .innerJoin(schema.organisations, eq(schema.organisations.id, p.organisationId))
    .where(eq(p.slug, slug))
    .limit(1);
  if (!row) return null;
  return {
    organisationId: row.p.organisationId,
    slug: row.p.slug,
    name: row.p.tradeName,
    claimed: row.p.claimStatus !== "Unclaimed",
    domain: domainOf(row.p.website),
    place: [row.p.city, row.state].filter(Boolean).join(", "),
    type: row.p.types[0] ?? null,
  };
}

export type ClaimView = typeof c.$inferSelect;

/** The person's latest claim on this company, if any. */
export async function myClaim(db: Executor, userId: string, organisationId: string): Promise<ClaimView | null> {
  const [row] = await db
    .select()
    .from(c)
    .where(and(eq(c.claimantId, userId), eq(c.organisationId, organisationId)))
    .orderBy(desc(c.createdAt))
    .limit(1);
  return row ?? null;
}

async function openTarget(db: Executor, slug: string): Promise<ClaimTarget> {
  const target = await claimTarget(db, slug);
  if (!target) throw new ClaimError("This company isn't in the directory.");
  if (target.claimed) throw new ClaimError("This profile has already been claimed. Ask to join the team instead.");
  return target;
}

/** Step 3 · Company email code (493:387): checks the domain, then sends a 6-digit code to that address. */
export async function startEmailClaim(
  db: Database,
  input: { slug: string; userId: string; email: string; name?: string; context?: RequestContext },
): Promise<{ claimId: string }> {
  const target = await openTarget(db, input.slug);
  if (!target.domain) throw new ClaimError("This profile has no website to check an email against. Use GSTIN instead.");
  const email = input.email.trim().toLowerCase();
  if (!emailMatchesDomain(email, target.domain)) {
    throw new ClaimError(`Use an email address on ${target.domain}`, "email");
  }
  const mine = await myClaim(db, input.userId, target.organisationId);
  let claimId = mine?.status === "Started" ? mine.id : null;
  if (claimId) {
    await db.update(c).set({ email, method: "email" }).where(eq(c.id, claimId));
  } else {
    if (mine?.status === "Pending") throw new ClaimError("Your claim is already waiting for review.");
    const [row] = await db
      .insert(c)
      .values({ organisationId: target.organisationId, claimantId: input.userId, method: "email", email })
      .returning({ id: c.id });
    claimId = row?.id ?? null;
  }
  if (!claimId) throw new Error("claim not saved");
  try {
    await sendCode({
      key: `claim:${claimId}`,
      channel: "email",
      to: email,
      name: input.name,
      template: "email.claim_code",
      event: "company.claim_code",
    });
  } catch (error) {
    if (error instanceof RecoveryCodeError)
      throw new ClaimError("Wait a little before asking for another code.", "email");
    throw error;
  }
  return { claimId };
}

/** The code matched: the claim goes to an operator with the email marked verified (A137). */
export async function confirmEmailClaim(
  db: Database,
  input: { claimId: string; userId: string; code: string; context?: RequestContext },
): Promise<void> {
  const [claim] = await db.select().from(c).where(eq(c.id, input.claimId)).limit(1);
  if (!claim || claim.claimantId !== input.userId || claim.status !== "Started" || !claim.email) {
    throw new ClaimError("This claim can't take a code any more. Start again.");
  }
  try {
    await checkCode({ key: `claim:${claim.id}`, to: claim.email, code: input.code });
  } catch (error) {
    if (error instanceof RecoveryCodeError) {
      throw new ClaimError(
        error.code === "EXPIRED_CODE"
          ? "That code has expired. Send a new one."
          : "That code didn't work. Check it and try again.",
        "code",
      );
    }
    throw error;
  }
  await changeStatus(db, {
    table: c,
    entityType: "company_claim",
    id: claim.id,
    from: "Started",
    to: "Pending",
    actorId: input.userId,
    transitions: CLAIM_TRANSITIONS,
    context: input.context,
    also: async (tx) => {
      await tx.update(c).set({ emailVerifiedAt: new Date() }).where(eq(c.id, claim.id));
    },
  });
}

/** Step 4 · GSTIN and authorisation letter (493:784): straight to review. */
export async function submitGstinClaim(
  db: Database,
  input: { slug: string; userId: string; gstin: string; letterFileId: string; context?: RequestContext },
): Promise<{ claimId: string }> {
  const target = await openTarget(db, input.slug);
  const gstin = input.gstin.replace(/\s+/g, "").toUpperCase();
  if (!GSTIN.test(gstin)) throw new ClaimError("Enter the 15-character GSTIN, like 27AABCH1234M1Z5", "gstin");
  if (!input.letterFileId) throw new ClaimError("Upload the authorisation letter", "letter");
  const mine = await myClaim(db, input.userId, target.organisationId);
  if (mine?.status === "Pending") throw new ClaimError("Your claim is already waiting for review.");
  const [row] = await db
    .insert(c)
    .values({
      organisationId: target.organisationId,
      claimantId: input.userId,
      method: "gstin",
      gstin,
      letterFileId: input.letterFileId,
      status: "Pending",
    })
    .returning({ id: c.id });
  if (!row) throw new Error("claim not saved");
  await audit(db, {
    actorId: input.userId,
    action: "company.claim.submitted",
    resourceType: "company_claim",
    resourceId: row.id,
    companyId: target.organisationId,
    after: { method: "gstin", gstin },
    context: input.context,
  });
  return { claimId: row.id };
}

/** Claims waiting for an operator (the Verification desk), oldest first. */
export async function pendingClaims(db: Executor, actor: Actor) {
  assertCan(actor, "verification.view");
  return db
    .select({
      claim: c,
      company: p.tradeName,
      slug: p.slug,
      claimant: schema.users.name,
      claimantEmail: schema.users.email,
    })
    .from(c)
    .innerJoin(p, eq(p.organisationId, c.organisationId))
    .innerJoin(schema.users, eq(schema.users.id, c.claimantId))
    .where(eq(c.status, "Pending"))
    .orderBy(c.createdAt);
}

/**
 * An operator approves (494:323) or rejects with a reason (494:371). Approval makes the claimant an Admin of the
 * company and the profile Claimed, in one transaction with the status change and the audit entry; any other pending
 * claim on the company is rejected as already claimed.
 */
export async function decideClaim(
  db: Database,
  actor: Actor,
  input: { claimId: string; approve: boolean; reason?: string; context?: RequestContext },
): Promise<void> {
  assertCan(actor, "verification.edit");
  const [claim] = await db.select().from(c).where(eq(c.id, input.claimId)).limit(1);
  if (!claim) throw new ClaimError("No such claim");
  const reason = input.reason?.trim() ?? "";
  if (!input.approve && !reason) throw new ClaimError("Say why, so the person knows what to send", "reason");
  await changeStatus(db, {
    table: c,
    entityType: "company_claim",
    id: claim.id,
    from: "Pending",
    to: input.approve ? "Approved" : "Rejected",
    actorId: actor.userId,
    transitions: CLAIM_TRANSITIONS,
    reason: reason || undefined,
    context: input.context,
    also: async (tx) => {
      await tx
        .update(c)
        .set({ decidedBy: actor.userId, decidedAt: new Date(), reason: reason || null })
        .where(eq(c.id, claim.id));
      if (!input.approve) return;
      const [profile] = await tx.select().from(p).where(eq(p.organisationId, claim.organisationId)).limit(1);
      if (profile?.claimStatus !== "Unclaimed") throw new ClaimError("This profile has already been claimed.");
      await tx.update(p).set({ claimStatus: "Claimed" }).where(eq(p.organisationId, claim.organisationId));
      await tx
        .insert(schema.memberships)
        .values({ organisationId: claim.organisationId, userId: claim.claimantId, role: "Admin" })
        .onConflictDoUpdate({
          target: [schema.memberships.organisationId, schema.memberships.userId],
          set: { role: "Admin" },
        });
      await tx
        .update(c)
        .set({ status: "Rejected", reason: "Another person's claim was approved first.", decidedAt: new Date() })
        .where(and(eq(c.organisationId, claim.organisationId), eq(c.status, "Pending")));
      await audit(tx, {
        actorId: actor.userId,
        action: "company.claim.approved",
        resourceType: "company_profile",
        resourceId: claim.organisationId,
        companyId: claim.organisationId,
        before: { claimStatus: "Unclaimed" },
        after: { claimStatus: "Claimed", admin: claim.claimantId },
        context: input.context,
      });
    },
  });
}

export interface CompanyProfileView {
  organisationId: string;
  slug: string;
  name: string;
  types: string[];
  categories: string[];
  summary: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  foundedYear: number | null;
  employees: string | null;
  claimed: boolean;
  verified: boolean;
  sample: boolean;
  /** The approved storefront sections (step 8.7). */
  storefront: StorefrontData;
}

/** A public company profile (481:8), pre-seeded ones included; sample ones only with sample content on. */
export async function companyProfile(
  db: Executor,
  slug: string,
  opts: { includeSample: boolean },
): Promise<CompanyProfileView | null> {
  const [row] = await db
    .select({ p, org: schema.organisations })
    .from(p)
    .innerJoin(schema.organisations, eq(schema.organisations.id, p.organisationId))
    .where(eq(p.slug, slug))
    .limit(1);
  if (!row || row.org.deletedAt || (row.p.sample && !opts.includeSample)) return null;
  return {
    organisationId: row.p.organisationId,
    slug: row.p.slug,
    name: row.p.tradeName,
    types: row.p.types,
    categories: row.p.categories,
    summary: row.p.summary,
    city: row.p.city,
    state: row.org.state,
    website: row.p.website,
    foundedYear: row.p.foundedYear,
    employees: row.p.employees,
    claimed: row.p.claimStatus !== "Unclaimed",
    verified: row.org.verification === "Verified",
    sample: row.p.sample,
    storefront: row.p.storefront,
  };
}
