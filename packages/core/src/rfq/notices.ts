import { parseServerEnv } from "@h2india/config";
import { schema, type Executor } from "@h2india/db";
import { renderQuoteReceived, renderRfqApproved, renderRfqReceived, renderRfqReturned } from "@h2india/emails";
import { and, eq, sql } from "drizzle-orm";
import { notify } from "../notify/notify";
import { formatIstDate, formatIstTime } from "../time";

// RFQ notices (step 9.4). When an RFQ goes out, everyone at each chosen supplier who can quote gets RFQ received
// (email 671:482, WhatsApp 668:44, in-app); the buyer who wrote it gets Your RFQ is live or Your RFQ needs a few details
// (671:554). Callers send these only after the status change succeeded, so each goes once.

const appUrl = () => parseServerEnv().APP_URL;

async function rfqFacts(db: Executor, rfqId: string) {
  const r = schema.rfqs;
  const [row] = await db
    .select({
      rfq: r,
      category: sql<string | null>`(select label from core.catalogue_categories c where c.id = core.rfqs.category_id)`,
      state: sql<string | null>`(select state from core.delivery_sites d where d.id = core.rfqs.delivery_site_id)`,
      buyerType: sql<
        string | null
      >`(select p.types[1] from core.company_profiles p where p.organisation_id = core.rfqs.organisation_id)`,
      creator: sql<string>`(select u.name from core.users u where u.id = core.rfqs.created_by)`,
      buyerName: sql<string>`(select coalesce(p.trade_name, o.legal_name) from core.organisations o left join core.company_profiles p on p.organisation_id = o.id where o.id = core.rfqs.organisation_id)`,
    })
    .from(r)
    .where(eq(r.id, rfqId));
  if (!row) return null;
  const [item] = await db
    .select()
    .from(schema.rfqItems)
    .where(eq(schema.rfqItems.rfqId, rfqId))
    .orderBy(schema.rfqItems.position)
    .limit(1);
  return { ...row, item: item ?? null };
}

/** People at a supplier who can quote (their role has quote.send). */
async function quoters(db: Executor, organisationId: string) {
  const m = schema.memberships;
  return db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(m)
    .innerJoin(schema.users, eq(schema.users.id, m.userId))
    .where(
      and(
        eq(m.organisationId, organisationId),
        sql`exists (select 1 from core.roles ro join core.role_permissions rp on rp.role_id = ro.id
          where ro.name = ${m.role} and ro.scope = 'supplier' and rp.permission_key = 'quote.send')`,
      ),
    );
}

/** RFQ received, to every chosen supplier. */
export async function sendRfqReceived(db: Executor, rfqId: string) {
  const f = await rfqFacts(db, rfqId);
  if (!f) return;
  const recipients = await db
    .select({
      organisationId: schema.rfqSuppliers.organisationId,
      name: schema.companyProfiles.tradeName,
      legal: schema.organisations.legalName,
    })
    .from(schema.rfqSuppliers)
    .innerJoin(schema.organisations, eq(schema.organisations.id, schema.rfqSuppliers.organisationId))
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, schema.rfqSuppliers.organisationId))
    .where(eq(schema.rfqSuppliers.rfqId, rfqId));
  const buyerType = (f.buyerType ?? "buyer").toLowerCase();
  const quantity = f.item ? `${String(f.item.quantity)}${f.item.unit === "units" ? "" : ` ${f.item.unit}`}` : "";
  const due = f.rfq.offerDeadline ? formatIstDate(f.rfq.offerDeadline) : "";
  const item = f.item?.description ?? f.rfq.title;
  const url = `${appUrl()}/supplier/rfqs/${rfqId}`;
  for (const s of recipients) {
    for (const person of await quoters(db, s.organisationId)) {
      await notify({
        event: "rfq.received",
        topic: "rfq.received",
        userId: person.id,
        scope: s.organisationId,
        email: {
          template: "email.rfq_received_supplier",
          mail: await renderRfqReceived(appUrl(), {
            name: person.name,
            supplier: s.name ?? s.legal,
            reference: f.rfq.reference,
            item,
            category: f.category ?? "",
            quantity,
            buyerType,
            deliverTo: f.state ?? "",
            due,
            quoteUrl: url,
            declineUrl: `${url}?decline=1`,
            preferencesUrl: `${appUrl()}/notifications?tab=email`,
          }),
        },
        whatsapp: {
          template: "whatsapp.rfq_received_supplier",
          data: {
            name: person.name.split(/\s+/)[0] ?? person.name,
            buyerType,
            item: item.charAt(0).toLowerCase() + item.slice(1),
            quantity,
            state: f.state ?? "India",
            due,
          },
        },
        inApp: {
          category: "quotes",
          icon: "file-text",
          title: `New ${f.rfq.reference}: ${item}`,
          href: `/supplier/rfqs/${rfqId}`,
        },
      });
    }
  }
}

/** Your RFQ is live (approved) or Your RFQ needs a few details (returned), to the buyer who wrote it. */
export async function sendRfqChecked(
  db: Executor,
  rfqId: string,
  outcome: { approved: true; suppliers: number } | { approved: false; reasons: string[]; note: string | null },
) {
  const f = await rfqFacts(db, rfqId);
  if (!f) return;
  const summary = f.item ? `${f.item.description} × ${String(f.item.quantity)}` : f.rfq.title;
  const viewUrl = `${appUrl()}/buyer/rfqs/${rfqId}`;
  const mail = outcome.approved
    ? await renderRfqApproved(appUrl(), {
        name: f.creator,
        reference: f.rfq.reference,
        summary,
        suppliers: outcome.suppliers,
        viewUrl,
      })
    : await renderRfqReturned(appUrl(), {
        name: f.creator,
        reference: f.rfq.reference,
        summary,
        whatToAdd: outcome.reasons.join(", "),
        note: outcome.note ?? "",
        editUrl: `${appUrl()}/rfq/new?draft=${rfqId}`,
        viewUrl,
      });
  await notify({
    event: outcome.approved ? "rfq.approved" : "rfq.returned",
    topic: "rfq.checked",
    userId: f.rfq.createdBy,
    scope: f.rfq.organisationId,
    email: { template: "email.rfq_returned", mail },
    inApp: {
      category: "quotes",
      icon: outcome.approved ? "check-circle" : "pencil",
      title: outcome.approved ? `${f.rfq.reference} went to suppliers` : `${f.rfq.reference} needs a few details`,
      href: outcome.approved ? `/buyer/rfqs/${rfqId}` : `/rfq/new?draft=${rfqId}`,
    },
  });
}

/** Quote received (665:9), to the buyer who wrote the RFQ, when a supplier sends or revises a quote. */
export async function sendQuoteReceived(db: Executor, quoteId: string) {
  const [q] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, quoteId));
  if (!q?.sentVersion) return;
  const f = await rfqFacts(db, q.rfqId);
  if (!f) return;
  const [version] = await db
    .select()
    .from(schema.quoteVersions)
    .where(and(eq(schema.quoteVersions.quoteId, quoteId), eq(schema.quoteVersions.version, q.sentVersion)));
  const [supplier] = await db
    .select({
      name: sql<string>`coalesce(${schema.companyProfiles.tradeName}, ${schema.organisations.legalName})`,
      city: schema.companyProfiles.city,
      verified: schema.organisations.verification,
    })
    .from(schema.organisations)
    .leftJoin(schema.companyProfiles, eq(schema.companyProfiles.organisationId, schema.organisations.id))
    .where(eq(schema.organisations.id, q.organisationId));
  const counts = await db
    .select({
      suppliers: sql<number>`(select count(*)::int from core.rfq_suppliers x where x.rfq_id = ${q.rfqId})`,
      quotes: sql<number>`(select count(*)::int from core.quotes x where x.rfq_id = ${q.rfqId} and x.sent_version is not null and x.status <> 'Withdrawn')`,
    })
    .from(sql`(select 1) as one`);
  const site = await db
    .select({ line: sql<string>`concat_ws(', ', d.name, d.city, d.state)` })
    .from(sql`core.delivery_sites d`)
    .where(sql`d.id = ${f.rfq.deliverySiteId}`);
  const item = f.item?.description ?? f.rfq.title;
  const qty = f.item
    ? `${String(f.item.quantity)} ${f.item.quantity === 1 ? f.item.unit.replace(/s$/, "") : f.item.unit}`
    : "";
  const url = `${appUrl()}/buyer/rfqs/${q.rfqId}`;
  await notify({
    event: "quote.received",
    topic: "quote.sent",
    userId: f.rfq.createdBy,
    scope: f.rfq.organisationId,
    email: {
      template: "email.quote_received_buyer",
      mail: await renderQuoteReceived(appUrl(), {
        name: f.creator,
        buyerCompany: f.buyerName,
        reference: f.rfq.reference,
        item: f.category ?? item,
        itemLong: `${item.charAt(0).toLowerCase()}${item.slice(1)}${qty ? ` (${qty})` : ""}`,
        supplier: supplier?.name ?? "A supplier",
        supplierLine: [supplier?.verified === "Verified" ? "verified supplier" : null, supplier?.city]
          .filter(Boolean)
          .join(", "),
        quotes: counts[0]?.quotes ?? 1,
        suppliers: counts[0]?.suppliers ?? 1,
        validUntil: version?.validUntil
          ? `${formatIstDate(version.validUntil)}, ${formatIstTime(version.validUntil)} IST`
          : "",
        deliverTo: site[0]?.line ?? f.state ?? "",
        revised: q.sentVersion > 1,
        compareUrl: url,
        rfqUrl: url,
      }),
    },
    inApp: {
      category: "quotes",
      icon: "file-text",
      title: `${supplier?.name ?? "A supplier"} ${q.sentVersion > 1 ? "revised their quote" : "sent a quote"} for ${f.rfq.reference}`,
      href: `/buyer/rfqs/${q.rfqId}`,
    },
  });
}

/**
 * An in-app note to everyone who can quote at each chosen supplier (or one supplier): the deadline moved, the RFQ
 * closed, quotes were declined, or the buyer asks for a revised quote. No email is drawn for these (A167).
 */
export async function tellSuppliers(
  db: Executor,
  rfqId: string,
  input: { event: string; title: string; organisationIds?: string[] },
) {
  const recipients = await db
    .select({ organisationId: schema.rfqSuppliers.organisationId })
    .from(schema.rfqSuppliers)
    .where(eq(schema.rfqSuppliers.rfqId, rfqId));
  const ids = recipients
    .map((x) => x.organisationId)
    .filter((id) => !input.organisationIds || input.organisationIds.includes(id));
  for (const organisationId of ids)
    for (const person of await quoters(db, organisationId))
      await notify({
        event: input.event,
        topic: "rfq.received",
        userId: person.id,
        scope: organisationId,
        inApp: { category: "quotes", icon: "file-text", title: input.title, href: `/supplier/rfqs/${rfqId}` },
      });
}
