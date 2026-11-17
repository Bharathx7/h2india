import { schema, type Database, type Executor, type StorefrontData } from "@h2india/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import type { Actor } from "../authz/actor";
import { assertCan } from "../authz/can";
import { inScope, type Scope } from "../authz/scope";
import { slugifyCompany } from "../companies/import";
import { attachFile } from "../files/files";
import { queueIndexChange } from "../search/outbox";
import { queueProductsOf } from "../search/products";
import { storefrontProblems, type StorefrontField } from "./storefront-rules";

// The storefront editor (590:8; phones 594:8), step 8.7. Changes are saved as a draft ("Nothing changes for buyers
// until you publish"); Publish changes sends them to H2 Economy, and the public profile (482:8) updates on approval.
// Until a lighter storefront review is decided, every publish uses the Listings queue (playbook 8.7, A160).

const r = schema.storefrontRevisions;
const prof = schema.companyProfiles;

export class StorefrontError extends Error {
  constructor(
    message: string,
    readonly problems: Partial<Record<StorefrontField, string>> = {},
  ) {
    super(message);
  }
}

export interface StorefrontForm extends StorefrontData {
  /** Product categories (590:8 "Goes to review"). */
  categories?: string[];
  website?: string;
  city?: string;
  foundedYear?: number | null;
}

const clean = (f: StorefrontForm): StorefrontForm => {
  const t = (v: string | undefined, max = 600) => (v ?? "").trim().slice(0, max) || undefined;
  const list = (v: string[] | undefined) =>
    (v ?? [])
      .map((x) => x.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 20);
  return {
    logoFileId: f.logoFileId,
    about: t(f.about, 1000),
    capabilities: t(f.capabilities),
    capacity: t(f.capacity, 80),
    leadTime: t(f.leadTime, 80),
    industries: list(f.industries),
    locations: (f.locations ?? []).filter((l) => l.name.trim()).slice(0, 10),
    contactEmail: t(f.contactEmail, 120),
    contactPhone: t(f.contactPhone, 30),
    categories: list(f.categories),
    website: t(f.website, 200),
    city: t(f.city, 80),
    foundedYear: f.foundedYear ?? null,
  };
};

/** The live storefront and the change in progress (Draft, In review or Needs changes). Company-scoped. */
export async function storefrontView(db: Executor, scope: Scope, organisationId: string) {
  const [p] = await db
    .select()
    .from(prof)
    .where(and(inScope(scope, prof.organisationId), eq(prof.organisationId, organisationId)));
  const [open] = await db
    .select()
    .from(r)
    .where(
      and(
        inScope(scope, r.organisationId),
        eq(r.organisationId, organisationId),
        inArray(r.status, ["Draft", "In review", "Needs changes"]),
      ),
    )
    .orderBy(desc(r.submittedAt))
    .limit(1);
  const [published] = await db
    .select({ at: r.decidedAt })
    .from(r)
    .where(and(eq(r.organisationId, organisationId), eq(r.status, "Approved")))
    .orderBy(desc(r.decidedAt))
    .limit(1);
  const live = liveForm(p);
  const working = { ...live, ...((open?.data ?? {}) as StorefrontForm) };
  const changed = Object.keys(open?.data ?? {}).filter(
    (k) =>
      JSON.stringify((live as Record<string, unknown>)[k] ?? null) !==
      JSON.stringify((working as Record<string, unknown>)[k] ?? null),
  );
  return { profile: p ?? null, live, working, open: open ?? null, changed, lastPublished: published?.at ?? null };
}

/** The storefront buyers see now, in the editor's shape. */
function liveForm(p: typeof prof.$inferSelect | undefined): StorefrontForm {
  return p
    ? {
        ...p.storefront,
        about: p.storefront.about ?? p.summary ?? undefined,
        categories: p.categories,
        website: p.website ?? undefined,
        city: p.city ?? undefined,
        foundedYear: p.foundedYear,
      }
    : {};
}

/** Whether a saved draft differs from the live storefront (cleaned the same way, so blanks compare equal). */
function differs(live: StorefrontForm, draft: StorefrontForm): boolean {
  const a = clean(live) as Record<string, unknown>;
  const b = clean(draft) as Record<string, unknown>;
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].some(
    (k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null),
  );
}

/** A supplier who joined (step 3.3) has no public profile yet: the first storefront save makes one. */
async function ensureProfile(db: Executor, organisationId: string) {
  const [p] = await db.select({ id: prof.organisationId }).from(prof).where(eq(prof.organisationId, organisationId));
  if (p) return;
  const [org] = await db
    .select({ name: schema.organisations.legalName })
    .from(schema.organisations)
    .where(eq(schema.organisations.id, organisationId));
  const base = slugifyCompany(org?.name ?? "company");
  const taken = await db.select({ slug: prof.slug }).from(prof).where(eq(prof.slug, base));
  const slug = taken.length ? `${base}-${organisationId.slice(0, 6)}` : base;
  await db
    .insert(prof)
    .values({ organisationId, slug, tradeName: org?.name ?? "Company", claimStatus: "Claimed" })
    .onConflictDoNothing();
}

/** Saved as a draft: nothing changes for buyers. */
export async function saveStorefrontDraft(db: Database, actor: Actor, organisationId: string, form: StorefrontForm) {
  assertCan(actor, "storefront.manage", { organisationId });
  const problems = storefrontProblems(form);
  if (Object.keys(problems).length) throw new StorefrontError("Check the highlighted fields", problems);
  await ensureProfile(db, organisationId);
  const data = clean(form);
  if (data.logoFileId) {
    await attachFile(db, {
      actor,
      fileId: data.logoFileId,
      kind: "logo",
      attachedType: "company_profile",
      attachedId: organisationId,
    }).catch((e: unknown) => {
      if (!(e instanceof Error) || !/already used/.test(e.message)) throw e;
    });
  }
  const [open] = await db
    .select()
    .from(r)
    .where(and(eq(r.organisationId, organisationId), inArray(r.status, ["Draft", "In review", "Needs changes"])));
  if (open?.status === "In review")
    throw new StorefrontError("Your last changes are with H2 Economy for review. You can edit again once they reply.");
  if (open)
    await db
      .update(r)
      .set({ data: data as Record<string, unknown>, status: "Draft" })
      .where(eq(r.id, open.id));
  else
    await db
      .insert(r)
      .values({ organisationId, status: "Draft", data: data as Record<string, unknown>, submittedBy: actor.userId });
}

/** Publish changes (590:8): to the Listings queue. A draft that matches the live storefront isn't sent. */
export async function publishStorefront(db: Database, actor: Actor, organisationId: string, context?: RequestContext) {
  assertCan(actor, "storefront.manage", { organisationId });
  const [p] = await db.select().from(prof).where(eq(prof.organisationId, organisationId));
  const [draft] = await db
    .select({ data: r.data })
    .from(r)
    .where(and(eq(r.organisationId, organisationId), eq(r.status, "Draft")));
  if (draft && !differs(liveForm(p), draft.data))
    throw new StorefrontError("Nothing has changed since your storefront was last approved");
  const done = await db
    .update(r)
    .set({ status: "In review", submittedAt: new Date(), submittedBy: actor.userId })
    .where(and(eq(r.organisationId, organisationId), eq(r.status, "Draft")))
    .returning({ id: r.id });
  if (!done.length) throw new StorefrontError("There are no changes to publish");
  await audit(db, {
    actorId: actor.userId,
    action: "storefront.submitted",
    resourceType: "storefront_revision",
    resourceId: done[0]?.id ?? "",
    companyId: organisationId,
    context,
  });
}

/** Take changes back from review (founder QC, 17 Nov 2026), to edit them again before H2 Economy decides. */
export async function withdrawStorefront(db: Database, actor: Actor, organisationId: string, context?: RequestContext) {
  assertCan(actor, "storefront.manage", { organisationId });
  const done = await db
    .update(r)
    .set({ status: "Draft" })
    .where(and(eq(r.organisationId, organisationId), eq(r.status, "In review")))
    .returning({ id: r.id });
  if (!done.length) throw new StorefrontError("Nothing is waiting for review");
  await audit(db, {
    actorId: actor.userId,
    action: "storefront.withdrawn",
    resourceType: "storefront_revision",
    resourceId: done[0]?.id ?? "",
    companyId: organisationId,
    context,
  });
}

/** Storefront changes waiting for an operator (shown with the Listings queue). */
export async function storefrontQueue(db: Executor, actor: Actor) {
  assertCan(actor, "queues.view");
  return db
    .select({ r, company: prof.tradeName, slug: prof.slug })
    .from(r)
    .leftJoin(prof, eq(prof.organisationId, r.organisationId))
    .where(eq(r.status, "In review"))
    .orderBy(r.submittedAt);
}

/** Approve (the profile updates at once) or send back with a note. */
export async function decideStorefront(
  db: Database,
  actor: Actor,
  input: { id: string; approve: boolean; note?: string; context?: RequestContext },
) {
  assertCan(actor, "queues.edit");
  const [rev] = await db.select().from(r).where(eq(r.id, input.id));
  if (!rev || rev.status !== "In review") throw new StorefrontError("This change has already been decided");
  const note = input.note?.trim() ?? "";
  if (!input.approve && !note) throw new StorefrontError("Say what to change");
  await db.transaction(async (tx) => {
    await tx
      .update(r)
      .set({
        status: input.approve ? "Approved" : "Needs changes",
        note: note || null,
        decidedBy: actor.userId,
        decidedAt: new Date(),
      })
      .where(eq(r.id, rev.id));
    if (input.approve) {
      // A revision always holds the whole form (saveStorefrontDraft cleans every field), so an empty field means the
      // supplier cleared it. Founder QC (17 Nov 2026): cleared fields used to fall back to the old values here.
      const d = rev.data as StorefrontForm;
      const [p] = await tx.select().from(prof).where(eq(prof.organisationId, rev.organisationId));
      const storefront: StorefrontData = {
        ...(p?.storefront ?? {}),
        logoFileId: d.logoFileId ?? p?.storefront.logoFileId,
        about: d.about,
        capabilities: d.capabilities,
        capacity: d.capacity,
        leadTime: d.leadTime,
        industries: d.industries,
        locations: d.locations,
        contactEmail: d.contactEmail,
        contactPhone: d.contactPhone,
      };
      await tx
        .update(prof)
        .set({
          storefront,
          summary: d.about ?? null,
          categories: d.categories ?? [],
          website: d.website ?? null,
          city: d.city ?? null,
          foundedYear: d.foundedYear ?? null,
        })
        .where(eq(prof.organisationId, rev.organisationId));
      await queueIndexChange(tx, "companies", [rev.organisationId]);
      await queueProductsOf(tx, { organisationIds: [rev.organisationId] });
    }
    await audit(tx, {
      actorId: actor.userId,
      action: input.approve ? "storefront.approved" : "storefront.changes_requested",
      resourceType: "storefront_revision",
      resourceId: rev.id,
      companyId: rev.organisationId,
      after: { note: note || null },
      context: input.context,
    });
  });
}

/**
 * For the checklist's Storefront basics (584:8): logo, about, locations on the live storefront. Until a storefront has
 * the basics live, changes sent for review count too (published: false), so the step reads "being checked" and a new
 * supplier can submit for review while H2 Economy checks the storefront.
 */
export async function storefrontFacts(db: Executor, organisationId: string) {
  const [p] = await db.select().from(prof).where(eq(prof.organisationId, organisationId));
  if (!p) return null;
  const live = {
    hasLogo: Boolean(p.storefront.logoFileId),
    hasAbout: Boolean(p.storefront.about ?? p.summary),
    locations: p.storefront.locations?.length ?? 0,
    published: true,
  };
  if (live.hasLogo && live.hasAbout) return live;
  const [rev] = await db
    .select({ data: r.data })
    .from(r)
    .where(and(eq(r.organisationId, organisationId), eq(r.status, "In review")))
    .orderBy(desc(r.submittedAt))
    .limit(1);
  if (!rev) return live;
  const d = rev.data as StorefrontForm;
  const hasLogo = live.hasLogo || Boolean(d.logoFileId);
  const hasAbout = live.hasAbout || Boolean(d.about);
  if (!hasLogo || !hasAbout) return live;
  return { hasLogo, hasAbout, locations: d.locations?.length ?? live.locations, published: false };
}
