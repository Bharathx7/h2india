import { schema, type Executor } from "@h2india/db";
import { and, eq, isNull, sql } from "drizzle-orm";

// Buyer onboarding checklist (553:8; phones 555:15), step 9.1: worked out from the company's records. The fifth step
// (first RFQ) counts RFQs from step 9.2 on.

export interface BuyerItem {
  key: "gstin" | "site" | "colleagues" | "rules" | "rfq";
  title: string;
  state: "done" | "todo";
  detail: string;
  badge?: string;
}

export interface BuyerFacts {
  gstin: { number: string; status: string; checkedAt: Date | null } | null;
  site: { name: string; city: string | null; contact: string | null } | null;
  people: number;
  invited: number;
  rules: boolean;
  rfqs: number;
}

export async function buyerFacts(db: Executor, organisationId: string): Promise<BuyerFacts> {
  const [gst] = await db
    .select({
      number: schema.organisationGstins.gstin,
      status: schema.organisationGstins.portalStatus,
      checkedAt: schema.organisationGstins.checkedAt,
    })
    .from(schema.organisationGstins)
    .where(eq(schema.organisationGstins.organisationId, organisationId))
    .orderBy(sql`${schema.organisationGstins.isDefault} desc`)
    .limit(1);
  const [site] = await db
    .select({
      name: schema.deliverySites.name,
      city: schema.deliverySites.city,
      contacts: schema.deliverySites.contacts,
    })
    .from(schema.deliverySites)
    .where(and(eq(schema.deliverySites.organisationId, organisationId), isNull(schema.deliverySites.deletedAt)))
    .orderBy(sql`${schema.deliverySites.isDefault} desc`)
    .limit(1);
  const [people] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.memberships)
    .where(eq(schema.memberships.organisationId, organisationId));
  const [invited] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.invitations)
    .where(and(eq(schema.invitations.organisationId, organisationId), isNull(schema.invitations.revokedAt)));
  const [rules] = await db
    .select({ above: schema.buyerSettings.approvalAbovePaise })
    .from(schema.buyerSettings)
    .where(eq(schema.buyerSettings.organisationId, organisationId));
  const rfqs = await db
    .execute(sql`select count(*)::int as n from core.rfqs where buyer_organisation_id = ${organisationId}`)
    .then(
      (r) => (r.rows[0] as { n?: number } | undefined)?.n ?? 0,
      () => 0,
    );
  return {
    gstin: gst ?? null,
    site: site ? { name: site.name, city: site.city, contact: site.contacts[0]?.name ?? null } : null,
    people: people?.n ?? 0,
    invited: invited?.n ?? 0,
    rules: rules?.above !== null && rules?.above !== undefined,
    rfqs,
  };
}

const date = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);

/** The five steps as drawn on 553:8. Pure: unit-tested. */
export function buildBuyerChecklist(f: BuyerFacts) {
  const items: BuyerItem[] = [
    {
      key: "gstin",
      title: "Verify your GSTIN",
      state: f.gstin?.status === "Active" ? "done" : "todo",
      detail: f.gstin
        ? f.gstin.status === "Active"
          ? `${f.gstin.number} verified${f.gstin.checkedAt ? ` on ${date(f.gstin.checkedAt)}` : ""}.`
          : `${f.gstin.number} · checking with GST records.`
        : "Add your company's GSTIN.",
      badge: f.gstin?.status === "Active" ? "GST verified" : f.gstin ? "Checking" : undefined,
    },
    {
      key: "site",
      title: "Add a delivery site",
      state: f.site ? "done" : "todo",
      detail: f.site
        ? `${[f.site.name, f.site.city].filter(Boolean).join(", ")}.${f.site.contact ? ` Receiving contact: ${f.site.contact}.` : ""}`
        : "Where suppliers deliver, with a receiving contact.",
    },
    {
      key: "colleagues",
      title: "Invite colleagues",
      state: f.people > 1 || f.invited > 0 ? "done" : "todo",
      detail: "Add the people who request quotes, approve orders or receive deliveries.",
    },
    {
      key: "rules",
      title: "Set approval rules",
      state: f.rules ? "done" : "todo",
      detail: "Choose who approves orders above an amount, for example ₹10 lakh.",
    },
    {
      key: "rfq",
      title: "Send your first RFQ",
      state: f.rfqs > 0 ? "done" : "todo",
      detail: "Ask up to 5 suppliers for quotes in one request.",
    },
  ];
  const done = items.filter((i) => i.state === "done").length;
  return { items, done, total: items.length, complete: done === items.length };
}

export async function buyerChecklist(db: Executor, organisationId: string) {
  return buildBuyerChecklist(await buyerFacts(db, organisationId));
}
