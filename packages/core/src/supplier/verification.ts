import { parseServerEnv } from "@h2india/config";
import { schema, type Database, type Executor } from "@h2india/db";
import { renderDocumentExpiring, renderVerificationChanges, renderVerified } from "@h2india/emails";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan, can } from "../authz/can";
import { inScope, scopeFor, type Scope } from "../authz/scope";
import { attachFile } from "../files/files";
import { notify } from "../notify/notify";
import { queueIndexChange } from "../search/outbox";
import { queueProductsOf } from "../search/products";
import { defineSetting, getSetting } from "../settings";
import { changeStatus } from "../status";
import { formatIstDate } from "../time";
import { registry } from "./adapters/registry";
import { REVIEW_TRANSITIONS } from "./review";
import {
  BADGE_KINDS,
  deskChecksProblem,
  deskEvidence,
  DOCUMENT_TRANSITIONS,
  DOCUMENT_TYPES,
  documentTitle,
  isBadgeKind,
  isDocumentType,
  type BadgeKind,
} from "./verification-rules";

// Verification documents, tiers and badges (step 8.2). Suppliers upload documents; operators check them in the
// Verification desk (635:9) and grant badges from recorded evidence (never from an automatic check alone); a document
// past its expiry pauses the badges resting on it; "Verified" on the company means the Verified supplier badge is
// active. Every decision is audit-logged.

const d = schema.verificationDocuments;
const b = schema.supplierBadges;
const vc = schema.verificationChecks;
const o = schema.organisations;

export class VerificationError extends Error {}

/** How long before expiry the supplier is told (586:8 "Expires in 30 days"; 673:221). */
export const EXPIRY_NOTICE = defineSetting<{ days: number }>({
  key: "verification.expiryNotice",
  description: "Verification: days before a document expires that the supplier is told and the desk lists it",
  schema: z.object({ days: z.number().int().min(1).max(120) }),
  fallback: { days: 30 },
});

const appUrl = () => parseServerEnv().APP_URL;

// ------------------------------------------------------------------------------------------------ supplier side

export interface UploadInput {
  type: string;
  name?: string;
  scope?: string;
  number?: string;
  fileId: string;
  issuedBy?: string;
  issuedOn?: Date | null;
  expiresOn?: Date | null;
  /** The document this renews or re-uploads. */
  replaces?: string;
}

export async function uploadDocument(
  db: Database,
  actor: Actor,
  organisationId: string,
  input: UploadInput,
  context?: RequestContext,
): Promise<{ id: string }> {
  if (!can(actor, "verification.manage", { organisationId })) throw new VerificationError("Not allowed");
  if (!isDocumentType(input.type) || input.type === "site_visit") throw new VerificationError("Choose a document");
  if (input.type === "certificate" && !input.name?.trim()) throw new VerificationError("Name the certificate");
  // Every uploadable document has a number, except a certificate, where it is optional.
  if (input.type !== "certificate" && !input.number?.trim()) {
    throw new VerificationError("Enter the number on the document");
  }
  if (input.expiresOn && input.expiresOn.getTime() < Date.now())
    throw new VerificationError("This document has expired");
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(d)
      .values({
        organisationId,
        type: input.type,
        name: input.name?.trim() || null,
        scope: input.scope?.trim() || null,
        number: input.number?.replace(/\s+/g, "").toUpperCase() || null,
        fileId: input.fileId,
        issuedBy: input.issuedBy?.trim() || null,
        issuedOn: input.issuedOn ?? null,
        expiresOn: input.expiresOn ?? null,
        replaces: input.replaces ?? null,
        createdBy: actor.userId,
      })
      .returning({ id: d.id });
    if (!row) throw new Error("document not saved");
    await attachFile(tx, {
      actor,
      fileId: input.fileId,
      kind: "verification_document",
      attachedType: "verification_document",
      attachedId: row.id,
    });
    await audit(tx, {
      actorId: actor.userId,
      action: "verification.document.submitted",
      resourceType: "verification_document",
      resourceId: row.id,
      companyId: organisationId,
      after: { type: input.type, name: input.name ?? null, expiresOn: input.expiresOn?.toISOString() ?? null },
      context,
    });
    return row;
  });
}

/** The company's current documents: the newest of each type and name (a re-upload hides what it replaces). */
export async function listDocuments(db: Executor, scope: Scope, organisationId: string) {
  const rows = await db
    .select()
    .from(d)
    .where(and(inScope(scope, d.organisationId), eq(d.organisationId, organisationId), isNull(d.deletedAt)))
    .orderBy(desc(d.createdAt));
  const replaced = new Set(rows.map((r) => r.replaces).filter(Boolean));
  return rows.filter((r) => !replaced.has(r.id)).sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
}

export async function listBadges(db: Executor, scope: Scope, organisationId: string) {
  return db
    .select()
    .from(b)
    .where(and(inScope(scope, b.organisationId), eq(b.organisationId, organisationId)))
    .orderBy(asc(b.grantedAt));
}

/** Badges anyone may see on the public profile: active ones, with the date last checked. */
export async function publicBadges(db: Executor, organisationId: string) {
  const rows = await db
    .select({ kind: b.kind, lastCheckedAt: b.lastCheckedAt })
    .from(b)
    .where(and(eq(b.organisationId, organisationId), eq(b.status, "Active")));
  return rows.filter((r) => isBadgeKind(r.kind)).map((r) => ({ ...r, label: BADGE_KINDS[r.kind as BadgeKind].label }));
}

// ------------------------------------------------------------------------------------------------ operator side

async function admins(db: Executor, organisationId: string) {
  return db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(and(eq(schema.memberships.organisationId, organisationId), eq(schema.memberships.role, "Admin")));
}

async function companyName(db: Executor, organisationId: string) {
  const [row] = await db
    .select({ legal: o.legalName, trade: schema.companyProfiles.tradeName })
    .from(o)
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, o.id))
    .where(eq(o.id, organisationId));
  return { legal: row?.legal ?? "", trade: row?.trade ?? row?.legal ?? "" };
}

/** Tells every admin of the company, by email and in-app (topic company.verification). */
async function tellAdmins(
  db: Executor,
  organisationId: string,
  event: string,
  build: (name: string) => Promise<{ subject: string; html: string; text: string }>,
  inApp: { title: string; body?: string },
) {
  for (const a of await admins(db, organisationId)) {
    await notify({
      event,
      topic: "company.verification",
      userId: a.id,
      scope: organisationId,
      email: { template: "email.verification_status", mail: await build(a.name) },
      inApp: { category: "account", icon: "shield-check", href: "/supplier/verification", ...inApp },
    });
  }
}

/** Verify, ask for a re-upload, or reject a document, with a reason for the last two. */
export async function decideDocument(
  db: Database,
  actor: Actor,
  input: {
    documentId: string;
    outcome: "Verified" | "Needs re-upload" | "Rejected";
    reason?: string;
    context?: RequestContext;
  },
) {
  assertCan(actor, "verification.edit");
  const [doc] = await db.select().from(d).where(eq(d.id, input.documentId));
  if (!doc) throw new VerificationError("No such document");
  const reason = input.reason?.trim() ?? "";
  if (input.outcome !== "Verified" && !reason) throw new VerificationError("Say what to fix, so the supplier knows");
  await changeStatus(db, {
    table: d,
    entityType: "verification_document",
    id: doc.id,
    from: "Submitted",
    to: input.outcome,
    actorId: actor.userId,
    companyId: doc.organisationId,
    reason: reason || undefined,
    transitions: DOCUMENT_TRANSITIONS,
    context: input.context,
    also: async (tx) => {
      await tx
        .update(d)
        .set({ checkedAt: new Date(), checkedBy: actor.userId, reason: reason || null, updatedAt: new Date() })
        .where(eq(d.id, doc.id));
      // A renewal that checks out carries the badges over from the document it replaces.
      if (input.outcome === "Verified" && doc.replaces) {
        await tx
          .update(b)
          .set({ documentIds: sql`array_replace(${b.documentIds}, ${doc.replaces}::uuid, ${doc.id}::uuid)` })
          .where(eq(b.organisationId, doc.organisationId));
      }
    },
  });
  if (input.outcome !== "Verified") {
    const names = await companyName(db, doc.organisationId);
    await tellAdmins(
      db,
      doc.organisationId,
      "verification.changes",
      (name) =>
        renderVerificationChanges(appUrl(), {
          name,
          company: names.trade,
          reasons: [{ item: documentTitle(doc), reason }],
          statusUrl: `${appUrl()}/supplier/verification`,
        }),
      { title: `${documentTitle(doc)}: ${input.outcome.toLowerCase()}`, body: reason },
    );
  } else {
    // Founder QC (17 Nov 2026): a checked document was silent. In the app only (no approved email wording, M21).
    for (const a of await admins(db, doc.organisationId))
      await notify({
        event: "verification.document_verified",
        topic: "company.verification",
        userId: a.id,
        scope: doc.organisationId,
        inApp: {
          category: "account",
          icon: "shield-check",
          href: "/supplier/verification",
          title: `${documentTitle(doc)} is verified`,
        },
      });
  }
}

/** Keep organisations.verification in step with the Verified supplier badge (what every page reads). */
async function syncCompanyVerified(tx: Executor, organisationId: string) {
  const [badge] = await tx
    .select({ status: b.status })
    .from(b)
    .where(and(eq(b.organisationId, organisationId), eq(b.kind, "verified_supplier")));
  const gst = await tx
    .select({ status: schema.organisationGstins.portalStatus })
    .from(schema.organisationGstins)
    .where(
      and(eq(schema.organisationGstins.organisationId, organisationId), isNull(schema.organisationGstins.retiredAt)),
    );
  const value =
    badge?.status === "Active"
      ? "Verified"
      : gst.some((g) => g.status === "Active")
        ? "GST verified"
        : gst.some((g) => g.status === "Pending")
          ? "Pending"
          : "Unverified";
  await tx.update(o).set({ verification: value }).where(eq(o.id, organisationId));
  // Profiles, product cards and search show the badge: refresh them.
  await queueIndexChange(tx, "companies", [organisationId]);
  await queueProductsOf(tx, { organisationIds: [organisationId] });
}

/**
 * Grant (or re-grant) a badge from recorded evidence (playbook watch-out): every document the kind needs must be
 * verified and current, and the operator names what was checked.
 */
export async function grantBadge(
  db: Database,
  actor: Actor,
  input: {
    organisationId: string;
    kind: string;
    evidence: string;
    context?: RequestContext;
    /** The supplier review that grants it (decideSupplierReview closes that one itself). */
    fromReview?: string;
  },
) {
  assertCan(actor, "verification.edit");
  if (!isBadgeKind(input.kind)) throw new VerificationError("No such badge");
  const evidence = input.evidence.trim();
  if (!evidence) throw new VerificationError("Say what you checked");
  const docs = await listDocuments(db, scopeFor(actor, { operatorArea: "verification" }), input.organisationId);
  const now = Date.now();
  const current = docs.filter((x) => x.status === "Verified" && (!x.expiresOn || x.expiresOn.getTime() > now));
  const needs = BADGE_KINDS[input.kind].needs as readonly string[];
  const missing = needs.filter((t) => !current.some((x) => x.type === t));
  if (missing.length) {
    throw new VerificationError(
      `Verify these first: ${missing.map((t) => DOCUMENT_TYPES[t as keyof typeof DOCUMENT_TYPES].label).join(", ")}`,
    );
  }
  const documentIds = current.filter((x) => needs.includes(x.type)).map((x) => x.id);
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(b)
      .where(and(eq(b.organisationId, input.organisationId), eq(b.kind, input.kind)));
    const values = {
      status: "Active",
      evidence,
      documentIds,
      verifiedBy: actor.userId,
      lastCheckedAt: new Date(),
      reason: null,
      updatedAt: new Date(),
    };
    const [row] = before
      ? await tx.update(b).set(values).where(eq(b.id, before.id)).returning({ id: b.id })
      : await tx
          .insert(b)
          .values({ organisationId: input.organisationId, kind: input.kind, ...values })
          .returning({ id: b.id });
    await audit(tx, {
      actorId: actor.userId,
      action: "badge.granted",
      resourceType: "supplier_badge",
      resourceId: row?.id ?? "",
      companyId: input.organisationId,
      before: before ? { status: before.status } : null,
      after: { kind: input.kind, status: "Active", evidence, documentIds },
      context: input.context,
    });
    await syncCompanyVerified(tx, input.organisationId);
  });
  if (input.kind === "verified_supplier") {
    // Founder QC (17 Nov 2026): granting the badge from the desk left the supplier's Submit for review open, so it
    // stayed in Needs action and the Suppliers queue. The badge answers it.
    const sr = schema.supplierReviews;
    const open = await db
      .select({ id: sr.id })
      .from(sr)
      .where(and(eq(sr.organisationId, input.organisationId), eq(sr.status, "Submitted")));
    for (const review of open.filter((x) => x.id !== input.fromReview))
      await changeStatus(db, {
        table: sr,
        entityType: "supplier_review",
        id: review.id,
        from: "Submitted",
        to: "Approved",
        actorId: actor.userId,
        companyId: input.organisationId,
        reason: "Verified supplier badge granted",
        transitions: REVIEW_TRANSITIONS,
        context: input.context,
        also: async (tx) => {
          await tx
            .update(sr)
            .set({ decidedBy: actor.userId, decidedAt: new Date(), updatedAt: new Date() })
            .where(eq(sr.id, review.id));
        },
      });
    const names = await companyName(db, input.organisationId);
    await tellAdmins(
      db,
      input.organisationId,
      "verification.verified",
      (name) =>
        renderVerified(appUrl(), {
          name,
          company: names.trade,
          checked: current.map((x) => documentTitle(x)),
          statusUrl: `${appUrl()}/supplier/verification`,
        }),
      { title: "You're verified", body: "Buyers now see the Verified supplier badge." },
    );
  }
}

/** Revoke badge (636:436): needs a reason; the company is told why by email. */
export async function revokeBadge(
  db: Database,
  actor: Actor,
  input: { badgeId: string; reason: string; note: string; context?: RequestContext },
) {
  assertCan(actor, "verification.edit");
  const reason = input.reason.trim();
  if (!reason) throw new VerificationError("Choose a reason");
  const [badge] = await db.select().from(b).where(eq(b.id, input.badgeId));
  if (!badge || badge.status === "Revoked") throw new VerificationError("This badge isn't active");
  await db.transaction(async (tx) => {
    await tx
      .update(b)
      .set({
        status: "Revoked",
        reason: [reason, input.note.trim()].filter(Boolean).join(" · "),
        updatedAt: new Date(),
      })
      .where(eq(b.id, badge.id));
    await audit(tx, {
      actorId: actor.userId,
      action: "badge.revoked",
      resourceType: "supplier_badge",
      resourceId: badge.id,
      companyId: badge.organisationId,
      before: { status: badge.status },
      after: { status: "Revoked", reason, note: input.note.trim() },
      context: input.context,
    });
    await syncCompanyVerified(tx, badge.organisationId);
  });
  const names = await companyName(db, badge.organisationId);
  const label = isBadgeKind(badge.kind) ? BADGE_KINDS[badge.kind].label : badge.kind;
  await tellAdmins(
    db,
    badge.organisationId,
    "verification.revoked",
    (name) =>
      renderVerificationChanges(appUrl(), {
        name,
        company: names.trade,
        reasons: [{ item: label, reason: input.note.trim() || reason }],
        statusUrl: `${appUrl()}/supplier/verification`,
      }),
    { title: `${label} badge removed`, body: input.note.trim() || reason },
  );
}

/** Approve or send back a supplier's Submit for review (584:8 step 5). Approving grants Verified supplier. */
export async function decideSupplierReview(
  db: Database,
  actor: Actor,
  input: {
    reviewId: string;
    approve: boolean;
    reason?: string;
    checks: Record<string, boolean>;
    context?: RequestContext;
  },
) {
  assertCan(actor, "verification.edit");
  const r = schema.supplierReviews;
  const [review] = await db.select().from(r).where(eq(r.id, input.reviewId));
  if (!review) throw new VerificationError("No such review");
  const reason = input.reason?.trim() ?? "";
  if (!input.approve && !reason) throw new VerificationError("Say what to fix, so the supplier knows");
  if (input.approve) {
    // Founder, 19 Nov 2026: the desk's "2 of 5" rule was only a disabled button; core holds it now.
    const problem = deskChecksProblem(input.checks);
    if (problem) throw new VerificationError(problem);
    await grantBadge(db, actor, {
      organisationId: review.organisationId,
      kind: "verified_supplier",
      evidence: `Supplier review: ${Object.entries(input.checks)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ")}`,
      context: input.context,
      fromReview: review.id,
    });
  }
  await changeStatus(db, {
    table: r,
    entityType: "supplier_review",
    id: review.id,
    from: "Submitted",
    to: input.approve ? "Approved" : "Changes requested",
    actorId: actor.userId,
    companyId: review.organisationId,
    reason: reason || undefined,
    transitions: REVIEW_TRANSITIONS,
    context: input.context,
    also: async (tx) => {
      await tx
        .update(r)
        .set({
          decidedBy: actor.userId,
          decidedAt: new Date(),
          reason: reason || null,
          checks: input.checks,
          updatedAt: new Date(),
        })
        .where(eq(r.id, review.id));
    },
  });
  if (!input.approve) {
    const names = await companyName(db, review.organisationId);
    await tellAdmins(
      db,
      review.organisationId,
      "verification.changes",
      (name) =>
        renderVerificationChanges(appUrl(), {
          name,
          company: names.trade,
          reasons: [{ item: "Your review", reason }],
          statusUrl: `${appUrl()}/supplier`,
        }),
      { title: "Your verification needs changes", body: reason },
    );
  }
}

/** Run checks again (635:9): GSTIN status from the GST check, PAN and CIN through the registry adapter. */
export async function runAutomatedChecks(db: Database, actor: Actor, organisationId: string) {
  assertCan(actor, "verification.edit");
  const [org] = await db.select().from(o).where(eq(o.id, organisationId));
  if (!org) throw new VerificationError("No such company");
  const gst = await db
    .select()
    .from(schema.organisationGstins)
    .where(
      and(eq(schema.organisationGstins.organisationId, organisationId), isNull(schema.organisationGstins.retiredAt)),
    );
  const docs = await listDocuments(db, scopeFor(actor, { operatorArea: "verification" }), organisationId);
  const results: { check: string; result: string; detail: string }[] = [];
  results.push(
    gst.some((g) => g.portalStatus === "Active")
      ? { check: "gstin", result: "pass", detail: "GSTIN is active" }
      : { check: "gstin", result: "fail", detail: "No active GSTIN" },
  );
  for (const kind of ["pan", "cin"] as const) {
    const doc = [...docs].reverse().find((x) => x.type === kind && x.number);
    const number = doc?.number ?? (kind === "pan" ? org.pan : null);
    if (!number) continue;
    const r = await registry().check({ kind, number, legalName: org.legalName });
    results.push({ check: kind, ...r });
  }
  const now = new Date();
  for (const r of results) {
    await db
      .insert(vc)
      .values({ organisationId, check: r.check, result: r.result, detail: r.detail, checkedAt: now })
      .onConflictDoUpdate({
        target: [vc.organisationId, vc.check],
        set: { result: r.result, detail: r.detail, checkedAt: now },
      });
  }
  await audit(db, {
    actorId: actor.userId,
    action: "verification.checks.run",
    resourceType: "organisation",
    resourceId: organisationId,
    companyId: organisationId,
    after: Object.fromEntries(results.map((r) => [r.check, r.result])),
  });
  return results;
}

export async function automatedChecks(db: Executor, organisationId: string) {
  return db.select().from(vc).where(eq(vc.organisationId, organisationId)).orderBy(asc(vc.check));
}

// ------------------------------------------------------------------------------------------------ clocks

/**
 * Daily: a verified document past its expiry becomes Expired and pauses every badge resting on it (A badge is a public
 * promise). Paused badges come back when a renewal is verified and the operator re-grants.
 */
export async function expireDocuments(db: Database, now: Date = new Date()): Promise<number> {
  const due = await db
    .select({ id: d.id, organisationId: d.organisationId })
    .from(d)
    .where(and(eq(d.status, "Verified"), isNotNull(d.expiresOn), lt(d.expiresOn, now), isNull(d.deletedAt)));
  for (const doc of due) {
    await changeStatus(db, {
      table: d,
      entityType: "verification_document",
      id: doc.id,
      from: "Verified",
      to: "Expired",
      actorId: null,
      companyId: doc.organisationId,
      reason: "Past its expiry date",
      transitions: DOCUMENT_TRANSITIONS,
      also: async (tx) => {
        const paused = await tx
          .update(b)
          .set({ status: "Paused", reason: "A document it rests on expired", updatedAt: now })
          .where(
            and(
              eq(b.organisationId, doc.organisationId),
              eq(b.status, "Active"),
              sql`${doc.id}::uuid = any(${b.documentIds})`,
            ),
          )
          .returning({ id: b.id, kind: b.kind });
        for (const p of paused) {
          await audit(tx, {
            actorId: null,
            action: "badge.paused",
            resourceType: "supplier_badge",
            resourceId: p.id,
            companyId: doc.organisationId,
            before: { status: "Active" },
            after: { status: "Paused", document: doc.id },
          });
        }
        if (paused.length) await syncCompanyVerified(tx, doc.organisationId);
      },
    });
  }
  return due.length;
}

/** Daily: tell the company's admins once, ahead of a document's expiry (673:221). */
export async function sendExpiryNotices(db: Database, now: Date = new Date()): Promise<number> {
  const { days } = await getSetting(db, EXPIRY_NOTICE);
  const limit = new Date(now.getTime() + days * 86_400_000);
  const due = await db
    .select()
    .from(d)
    .where(
      and(
        eq(d.status, "Verified"),
        isNull(d.noticeSentAt),
        isNotNull(d.expiresOn),
        lte(d.expiresOn, limit),
        isNull(d.deletedAt),
      ),
    );
  for (const doc of due) {
    const claimed = await db
      .update(d)
      .set({ noticeSentAt: now })
      .where(and(eq(d.id, doc.id), isNull(d.noticeSentAt)))
      .returning({ id: d.id });
    if (!claimed.length || !doc.expiresOn) continue;
    const names = await companyName(db, doc.organisationId);
    const others = (
      await db
        .select()
        .from(d)
        .where(and(eq(d.organisationId, doc.organisationId), eq(d.status, "Verified"), isNotNull(d.expiresOn)))
        .orderBy(asc(d.expiresOn))
    ).filter((x) => x.id !== doc.id);
    const next = others[0];
    const left = Math.max(0, Math.ceil((doc.expiresOn.getTime() - now.getTime()) / 86_400_000));
    await tellAdmins(
      db,
      doc.organisationId,
      "verification.expiring",
      (name) =>
        renderDocumentExpiring(appUrl(), {
          name,
          company: names.trade,
          companyLine: names.legal,
          document: documentTitle(doc),
          scope: doc.scope ?? undefined,
          expires: formatIstDate(doc.expiresOn ?? now),
          days: left,
          others: next?.expiresOn
            ? `All valid. Next to expire: ${documentTitle(next)}, ${formatIstDate(next.expiresOn)}`
            : "All valid.",
          uploadUrl: `${appUrl()}/supplier/verification?renew=${doc.id}`,
          statusUrl: `${appUrl()}/supplier/verification`,
        }),
      {
        title: `${documentTitle(doc)} expires in ${String(left)} days`,
        body: "Upload the renewed document to keep your badge.",
      },
    );
  }
  return due.length;
}

// ------------------------------------------------------------------------------------------------ the desk

export type DeskTab = "action" | "expiring" | "verified" | "revoked";

/** The Verification desk's left column (635:9), by tab. Operators with verification.view only. */
export async function verificationDesk(db: Executor, actor: Actor, tab: DeskTab, now: Date = new Date()) {
  assertCan(actor, "verification.view");
  const soon = new Date(now.getTime() + 60 * 86_400_000);
  const name = sql<string>`coalesce(${schema.companyProfiles.tradeName}, ${o.legalName})`;
  const base = db
    .select({ organisationId: o.id, name })
    .from(o)
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, o.id));
  if (tab === "action") {
    const docs = await db
      .select({
        organisationId: d.organisationId,
        type: d.type,
        name: d.name,
        createdAt: d.createdAt,
        replaces: d.replaces,
      })
      .from(d)
      .where(and(eq(d.status, "Submitted"), isNull(d.deletedAt)))
      .orderBy(asc(d.createdAt));
    const reviews = await db
      .select({ organisationId: schema.supplierReviews.organisationId, at: schema.supplierReviews.submittedAt })
      .from(schema.supplierReviews)
      .where(eq(schema.supplierReviews.status, "Submitted"));
    const banks = await db
      .select({
        organisationId: schema.payoutBankAccounts.organisationId,
        last4: schema.payoutBankAccounts.accountLast4,
        holdUntil: schema.payoutBankAccounts.holdUntil,
      })
      .from(schema.payoutBankAccounts)
      .where(eq(schema.payoutBankAccounts.status, "Held"));
    const ids = [
      ...new Set([
        ...reviews.map((r) => r.organisationId),
        ...banks.map((x) => x.organisationId),
        ...docs.map((x) => x.organisationId),
      ]),
    ];
    const names = ids.length ? await base.where(inArray(o.id, ids)) : [];
    return ids.map((id) => {
      const mine = docs.filter((x) => x.organisationId === id);
      const review = reviews.some((r) => r.organisationId === id);
      const bank = banks.find((x) => x.organisationId === id);
      return {
        organisationId: id,
        name: names.find((n) => n.organisationId === id)?.name ?? "",
        // Founder, 19 Nov 2026: a first upload read "Re-upload"; only a document that replaces another is one.
        tag: review ? "Review" : bank ? "Bank change" : mine.some((x) => x.replaces) ? "Re-upload" : "New documents",
        line: review
          ? "Submitted for review"
          : bank
            ? `New payout bank account ending ${bank.last4} · name matched · payouts on hold until ${bank.holdUntil ? formatIstDate(bank.holdUntil) : ""}`
            : `${mine.map((x) => documentTitle(x)).join(", ")} uploaded · waiting for a check`,
      };
    });
  }
  if (tab === "expiring") {
    const docs = await db
      .select({ organisationId: d.organisationId, type: d.type, name: d.name, expiresOn: d.expiresOn })
      .from(d)
      .where(and(eq(d.status, "Verified"), isNotNull(d.expiresOn), lte(d.expiresOn, soon), isNull(d.deletedAt)))
      .orderBy(asc(d.expiresOn));
    const ids = [...new Set(docs.map((x) => x.organisationId))];
    const names = ids.length ? await base.where(inArray(o.id, ids)) : [];
    return ids.map((id) => {
      const first = docs.find((x) => x.organisationId === id);
      const days = first?.expiresOn ? Math.ceil((first.expiresOn.getTime() - now.getTime()) / 86_400_000) : 0;
      return {
        organisationId: id,
        name: names.find((n) => n.organisationId === id)?.name ?? "",
        tag: "Expiring",
        line: first ? `${documentTitle(first)} expires in ${String(days)} days` : "",
      };
    });
  }
  const status = tab === "verified" ? "Active" : "Revoked";
  const rows = await db
    .select({ organisationId: b.organisationId, name, kind: b.kind, at: b.updatedAt })
    .from(b)
    .innerJoin(o, eq(o.id, b.organisationId))
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, o.id))
    .where(and(eq(b.status, status), eq(b.kind, "verified_supplier")))
    .orderBy(desc(b.updatedAt))
    .limit(200);
  return rows.map((r) => ({
    organisationId: r.organisationId,
    name: r.name,
    tag: tab === "verified" ? "Verified" : "Revoked",
    line: `${tab === "verified" ? "Checked" : "Revoked"} ${formatIstDate(r.at)}`,
  }));
}

export async function deskCounts(db: Executor, actor: Actor, now: Date = new Date()) {
  const [action, expiring, verified, revoked] = await Promise.all([
    verificationDesk(db, actor, "action", now),
    verificationDesk(db, actor, "expiring", now),
    verificationDesk(db, actor, "verified", now),
    verificationDesk(db, actor, "revoked", now),
  ]);
  return { action: action.length, expiring: expiring.length, verified: verified.length, revoked: revoked.length };
}

/** Everything the desk's right column shows for one company. */
export async function deskCompany(db: Executor, actor: Actor, organisationId: string) {
  assertCan(actor, "verification.view");
  const scope = scopeFor(actor, { operatorArea: "verification" });
  const [org] = await db
    .select({ org: o, profile: schema.companyProfiles })
    .from(o)
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, o.id))
    .where(eq(o.id, organisationId));
  if (!org) return null;
  const [gst] = await db
    .select()
    .from(schema.organisationGstins)
    .where(
      and(eq(schema.organisationGstins.organisationId, organisationId), isNull(schema.organisationGstins.retiredAt)),
    )
    .limit(1);
  const [documents, badges, checks, review] = await Promise.all([
    listDocuments(db, scope, organisationId),
    listBadges(db, scope, organisationId),
    automatedChecks(db, organisationId),
    db
      .select()
      .from(schema.supplierReviews)
      .where(eq(schema.supplierReviews.organisationId, organisationId))
      .orderBy(desc(schema.supplierReviews.submittedAt))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);
  const bank = await db
    .select({
      status: schema.payoutBankAccounts.status,
      nameMatches: schema.payoutBankAccounts.nameMatches,
      last4: schema.payoutBankAccounts.accountLast4,
    })
    .from(schema.payoutBankAccounts)
    .where(eq(schema.payoutBankAccounts.organisationId, organisationId))
    .orderBy(desc(schema.payoutBankAccounts.createdAt));
  return {
    org: org.org,
    profile: org.profile,
    gstin: gst ?? null,
    documents,
    badges,
    checks,
    review,
    evidence: deskEvidence(documents, bank),
  };
}
