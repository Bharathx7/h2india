import { schema, type Executor } from "@h2india/db";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { storefrontFacts } from "./storefront";
import { TIER_1 } from "./verification-rules";

// Onboarding checklist (584:8; phones 585:15), step 8.1. Every item is worked out from the supplier's records, never
// from ticks: company and GSTIN, payout bank account (step 8.6), storefront basics (step 8.7), first product or
// datasheet (step 8.3), and the submission for review. Later steps add their records to `facts()`.

export type ItemState = "done" | "checking" | "todo";

export interface ChecklistItem {
  key: "company" | "bank" | "storefront" | "product" | "review";
  title: string;
  state: ItemState;
  /** The grey line, for example "33AAJCP7712L1Z4 · checking in the background". */
  detail: string;
  /** A small badge, for example "Being checked" or "Name matches". */
  badge?: string;
}

export interface Checklist {
  items: ChecklistItem[];
  done: number;
  total: number;
  /** All five done: the dashboard replaces the checklist. */
  complete: boolean;
}

/** What the checklist reads. Each later step fills in its own part. */
export interface SupplierFacts {
  gstin: { number: string; status: string } | null;
  companyComplete: boolean;
  /** Tier 1 company documents (GST certificate, PAN): uploaded and verified (step 8.2). */
  documents: { uploaded: number; verified: number; needed: number };
  bank: { last4: string; nameMatches: boolean; verified: boolean } | null;
  storefront: { hasLogo: boolean; hasAbout: boolean; locations: number; published: boolean } | null;
  products: { total: number; submitted: number };
  review: "none" | "submitted" | "approved";
}

export async function supplierFacts(db: Executor, organisationId: string): Promise<SupplierFacts> {
  const [org] = await db.select().from(schema.organisations).where(eq(schema.organisations.id, organisationId));
  const [gst] = await db
    .select({ number: schema.organisationGstins.gstin, status: schema.organisationGstins.portalStatus })
    .from(schema.organisationGstins)
    .where(eq(schema.organisationGstins.organisationId, organisationId))
    .limit(1);
  const items = await db
    .select({ status: schema.products.status })
    .from(schema.products)
    .where(and(eq(schema.products.organisationId, organisationId), isNull(schema.products.deletedAt)));
  const [review] = await db
    .select({ status: schema.supplierReviews.status })
    .from(schema.supplierReviews)
    .where(eq(schema.supplierReviews.organisationId, organisationId))
    .orderBy(desc(schema.supplierReviews.submittedAt))
    .limit(1);
  const docs = await db
    .select({ type: schema.verificationDocuments.type, status: schema.verificationDocuments.status })
    .from(schema.verificationDocuments)
    .where(
      and(
        eq(schema.verificationDocuments.organisationId, organisationId),
        isNull(schema.verificationDocuments.deletedAt),
      ),
    );
  const tier1 = TIER_1 as readonly string[];
  const uploaded = new Set(docs.filter((x) => tier1.includes(x.type) && x.status !== "Rejected").map((x) => x.type));
  const verified = new Set(docs.filter((x) => tier1.includes(x.type) && x.status === "Verified").map((x) => x.type));
  const banks = await db
    .select({
      status: schema.payoutBankAccounts.status,
      last4: schema.payoutBankAccounts.accountLast4,
      match: schema.payoutBankAccounts.nameMatches,
    })
    .from(schema.payoutBankAccounts)
    .where(eq(schema.payoutBankAccounts.organisationId, organisationId))
    .orderBy(desc(schema.payoutBankAccounts.createdAt));
  const bank =
    banks.find((x) => x.status === "Active") ?? banks.find((x) => x.status === "Pending" || x.status === "Held");
  return {
    gstin: gst ?? null,
    documents: { uploaded: uploaded.size, verified: verified.size, needed: tier1.length },
    companyComplete: Boolean(org?.legalName && org.state && gst),
    bank: bank ? { last4: bank.last4, nameMatches: bank.match === true, verified: bank.status === "Active" } : null,
    storefront: await storefrontFacts(db, organisationId),
    products: { total: items.length, submitted: items.filter((p) => p.status !== "Draft").length },
    review: review?.status === "Approved" ? "approved" : review?.status === "Submitted" ? "submitted" : "none",
  };
}

const GST_WORDS: Record<string, string> = { Pending: "Being checked", Active: "Active" };

/** The five steps as drawn, in the order on 584:8. Pure: unit-tested. */
export function buildChecklist(f: SupplierFacts): Checklist {
  const docs = f.documents;
  const company: ChecklistItem = {
    key: "company",
    title: "Company details and GSTIN",
    state:
      !f.gstin || !f.companyComplete || docs.uploaded < docs.needed
        ? "todo"
        : f.gstin.status === "Active" && docs.verified >= docs.needed
          ? "done"
          : "checking",
    detail: f.gstin
      ? docs.uploaded < docs.needed
        ? `${f.gstin.number} · upload your GST certificate and PAN in Verification`
        : `${f.gstin.number}${f.gstin.status === "Pending" || docs.verified < docs.needed ? " · checking in the background" : ""}`
      : "Add your registered address and GSTIN",
    badge: f.gstin
      ? docs.uploaded >= docs.needed && (f.gstin.status !== "Active" || docs.verified < docs.needed)
        ? "Being checked"
        : (GST_WORDS[f.gstin.status] ?? f.gstin.status)
      : undefined,
  };
  const bank: ChecklistItem = {
    key: "bank",
    title: "Bank account",
    state: f.bank?.verified ? "done" : f.bank ? "checking" : "todo",
    detail: f.bank
      ? `Account ending ${f.bank.last4}${f.bank.nameMatches ? " · name matches your GST legal name" : ""}`
      : "Add the account that receives payouts",
    badge: f.bank ? (f.bank.nameMatches ? "Name matches" : "Being checked") : undefined,
  };
  const s = f.storefront;
  const parts = s
    ? [
        s.hasLogo ? "Logo" : null,
        s.hasAbout ? "about" : null,
        s.locations ? `${String(s.locations)} manufacturing ${s.locations === 1 ? "location" : "locations"}` : null,
      ].filter(Boolean)
    : [];
  const storefront: ChecklistItem = {
    key: "storefront",
    title: "Storefront basics",
    state: s?.hasLogo && s.hasAbout ? "done" : "todo",
    detail: parts.length
      ? `${parts.join(", ").replace(/, ([^,]*)$/, " and $1")} added`
      : "Add your logo, about and locations",
  };
  const product: ChecklistItem = {
    key: "product",
    title: "First product or datasheet",
    state: f.products.total ? "done" : "todo",
    detail: f.products.total
      ? `${String(f.products.total)} ${f.products.total === 1 ? "product" : "products"} added`
      : "Add a product, or upload a datasheet and we'll draft the listing for you to check.",
  };
  const review: ChecklistItem = {
    key: "review",
    title: "Submit for review",
    state: f.review === "approved" ? "done" : f.review === "submitted" ? "checking" : "todo",
    detail:
      f.review === "submitted"
        ? "H2 India is checking your company and first listing."
        : "H2 India checks your company and first listing before you go live.",
    badge: f.review === "submitted" ? "In review" : undefined,
  };
  const items = [company, bank, storefront, product, review];
  const done = items.filter((i) => i.state === "done").length;
  return { items, done, total: items.length, complete: done === items.length };
}

/** Submit for review is open once the first four are done or being checked. */
export function canSubmitForReview(c: Checklist): boolean {
  return c.items.slice(0, 4).every((i) => i.state !== "todo") && c.items[4]?.state === "todo";
}

export async function supplierChecklist(db: Executor, organisationId: string): Promise<Checklist> {
  return buildChecklist(await supplierFacts(db, organisationId));
}

/** Product counts by status for the dashboard tiles and attention list. */
export async function productCounts(db: Executor, organisationId: string) {
  const rows = await db
    .select({ status: schema.products.status, name: schema.products.name, updatedAt: schema.products.updatedAt })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.organisationId, organisationId),
        isNull(schema.products.deletedAt),
        ne(schema.products.status, "Archived"),
      ),
    );
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return {
    live: count("Live"),
    inReview: count("In review"),
    needsChanges: count("Needs changes"),
    paused: count("Paused"),
    drafts: count("Draft"),
    needsChangesNames: rows.filter((r) => r.status === "Needs changes").map((r) => r.name),
  };
}
