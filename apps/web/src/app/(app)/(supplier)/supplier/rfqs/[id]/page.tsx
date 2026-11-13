import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { supplierRfq } from "@h2india/core/rfq";
import { describeSchedule, PAYMENT_PRESETS } from "@h2india/core/rfq/totals";
import { formatIstDate, formatIstDateTime, formatIstDayMonth } from "@h2india/core/time";
import { buttonClasses, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { QuoteForm } from "@/supplier/rfq/actions";
import { DeclineRfq, MarkViewed, QuoteBuilder, WithdrawQuote } from "@/supplier/rfq/QuotePanel";
import { dueBadge } from "@/supplier/rfq/views";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// RFQ detail for a supplier (617:8 draft, 618:16 sent, 619:8 states), step 9.5. Messages with the buyer arrive in
// step 9.7. ?revise=1 opens the next version; ?decline=1 (from the RFQ received email) opens Decline.
export const metadata: Metadata = { title: "RFQ · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);
const day = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d) : "");

export default async function SupplierRfqPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revise?: string; decline?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = await requireSupplier(`/supplier/rfqs/${id}`);
  const s = page.supplier;
  const d = await supplierRfq(getDb(), scopeFor(page.actor), s.organisationId, id);
  if (!d) notFound();
  const canQuote = s.seat.permissions.has("quote.send");
  const item = d.items[0];
  const quote = d.quote;
  const sent = d.versions.filter((v) => v.state === "Sent");
  const latest = sent[sent.length - 1] ?? null;
  const draft = d.versions.find((v) => v.state === "Draft") ?? null;
  const status = quote?.status ?? null;
  const open = d.rfq.status !== "Closed" && d.recipient.status !== "Declined";
  const deadlinePassed = d.rfq.offerDeadline ? d.rfq.offerDeadline.getTime() <= new Date().getTime() : false;
  const revising = Boolean(draft && latest) || (sp.revise === "1" && latest !== null);
  const building =
    open &&
    canQuote &&
    (!latest || revising) &&
    !(status === "Withdrawn" || status === "Not selected" || status === "Accepted") &&
    !(deadlinePassed && !latest);
  const base = draft ?? latest;
  const line = base?.lines[0];
  const start: QuoteForm = {
    unitPrice: line ? Money.format(line.unitPricePaise, { symbol: false }).replace(/\.00$/, "") : "",
    gstRate: line ? String(line.gstRateBps / 100) : "18",
    hsn: line?.hsn ?? "",
    quantity: item?.quantity ?? 1,
    unit: item?.unit ?? "units",
    description: item?.description ?? d.rfq.title,
    rfqItemId: item?.id ?? null,
    freight: base ? Money.format(base.freightPaise, { symbol: false }).replace(/\.00$/, "") : "",
    leadTime: base?.leadTimeWeeks ? String(base.leadTimeWeeks) : "",
    deliveryTerms: base?.deliveryTerms ?? "",
    schedule: base
      ? (PAYMENT_PRESETS.find((p) => describeSchedule(p.lines) === describeSchedule(base.schedule))?.label ?? "")
      : "",
    warranty: base?.warrantyMonths ? String(base.warrantyMonths) : "",
    validUntil: day(base?.validUntil ?? null),
    changeNote: draft?.changeNote ?? "",
    documents: base?.documents ?? [],
  };
  const due = dueBadge(d.rfq.offerDeadline);
  const header =
    status === null
      ? "Not started"
      : status === "Draft"
        ? "Quote draft"
        : status === "Sent" || status === "Revised"
          ? "Quote sent"
          : status;
  return (
    <SupplierShell page={page} current="/supplier/rfqs" title="RFQs">
      <MarkViewed rfqId={d.rfq.id} />
      <Link href="/supplier/rfqs" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        RFQs
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">
          {d.rfq.reference} · {d.rfq.title}
        </h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge
            status={header}
            tone={status === "Sent" || status === "Revised" || status === "Accepted" ? "success" : "neutral"}
          />
          {due ? <StatusBadge status={`Quotes ${due.label.replace("Due in", "due in")}`} tone={due.tone} /> : null}
          {d.buyer}
          {d.buyerCity ? `, ${d.buyerCity}` : ""}
          {d.checked ? " · checked by H2 India" : ""}
          {d.rfq.offerDeadline ? ` · due ${formatIstDateTime(d.rfq.offerDeadline)}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">What the buyer needs</h2>
          <dl className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
            {(
              [
                ["Item", item ? `${item.description} × ${String(item.quantity)}` : d.rfq.title],
                [
                  "Specification",
                  item && Object.keys(item.specs).length
                    ? Object.entries(item.specs)
                        .map(([k, v]) => `${k} ${String(v)}`)
                        .join(" · ")
                    : "",
                ],
                ["Site", d.site ?? ""],
                ["Needed on site by", d.rfq.requiredBy ? formatIstDate(d.rfq.requiredBy) : ""],
                ["Delivery terms", d.rfq.deliveryTerms ?? ""],
                ["Payment terms", d.rfq.paymentTerms ?? ""],
                ["Note", d.rfq.requirements ?? ""],
              ] as [string, string][]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="type-body-sm text-secondary">{k}</dt>
                  <dd className="type-body-sm">{v}</dd>
                </div>
              ))}
            {d.files.length ? (
              <div className="contents">
                <dt className="type-body-sm text-secondary">Files</dt>
                <dd className="flex flex-wrap gap-x-3 type-body-sm">
                  {d.files.map((f) => (
                    <a key={f.id} href={`/api/v1/files/${f.id}/link`} className="underline">
                      {f.name}
                    </a>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
        <section className="flex flex-col gap-4 self-start rounded-card border border-default bg-page p-5">
          {building ? (
            <>
              <QuoteBuilder
                rfqId={d.rfq.id}
                supplierId={s.organisationId}
                start={start}
                version={(latest?.version ?? 0) + 1}
                previous={
                  latest?.lines[0]
                    ? `unit price ${rupees(latest.lines[0].unitPricePaise)} · lead time ${String(latest.leadTimeWeeks ?? "")} weeks`
                    : null
                }
                sentLabel={latest ? `v${String(latest.version)}` : null}
              />
              {!latest && d.recipient.status !== "Declined" ? (
                <DeclineRfq rfqId={d.rfq.id} buyer={d.buyer} startOpen={sp.decline === "1"} />
              ) : null}
            </>
          ) : latest ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="type-h3">Your quote</h2>
                <StatusBadge
                  status={
                    status === "Revised"
                      ? `Revised · v${String(latest.version)}`
                      : status === "Sent"
                        ? `Sent · v${String(latest.version)}`
                        : (status ?? "")
                  }
                  tone={status === "Accepted" || status === "Sent" || status === "Revised" ? "success" : "neutral"}
                />
              </div>
              <p className="type-caption text-secondary">
                {status === "Withdrawn" && quote?.withdrawnAt
                  ? `You withdrew v${String(latest.version)} on ${formatIstDateTime(quote.withdrawnAt)}. The buyer can't accept it any more.`
                  : status === "Expired" && latest.validUntil
                    ? `v${String(latest.version)} was valid until ${formatIstDate(latest.validUntil)}. The buyer hadn't decided by then, so it can't be accepted.`
                    : status === "Not selected"
                      ? `${d.buyer} chose another quote.`
                      : status === "Accepted" && quote?.acceptedAt
                        ? `${d.buyer} accepted v${String(latest.version)} on ${formatIstDateTime(quote.acceptedAt)}.`
                        : `Sent ${latest.sentAt ? formatIstDateTime(latest.sentAt) : ""}${latest.validUntil ? ` · valid until ${formatIstDate(latest.validUntil)}` : ""}`}
              </p>
              {latest.changeNote ? (
                <div className="rounded-card bg-subtle p-3">
                  <p className="type-label">What changed</p>
                  <p className="type-body-sm">{latest.changeNote}</p>
                </div>
              ) : null}
              {status === "Withdrawn" ? (
                <dl className="grid gap-2 rounded-card bg-subtle p-3 md:grid-cols-[140px_minmax(0,1fr)]">
                  <dt className="type-body-sm text-secondary">Reason</dt>
                  <dd className="type-body-sm">{quote?.withdrawReason}</dd>
                  {quote?.withdrawNote ? (
                    <>
                      <dt className="type-body-sm text-secondary">Note to the buyer</dt>
                      <dd className="type-body-sm">{quote.withdrawNote}</dd>
                    </>
                  ) : null}
                </dl>
              ) : (
                <dl className="grid gap-2 md:grid-cols-[150px_minmax(0,1fr)]">
                  {(
                    [
                      [
                        "Unit price, before GST",
                        latest.lines[0]
                          ? `${rupees(latest.lines[0].unitPricePaise)} × ${String(latest.lines[0].quantity)}`
                          : "",
                      ],
                      ["Freight", rupees(latest.freightPaise)],
                      [`GST ${String((latest.lines[0]?.gstRateBps ?? 0) / 100)}%`, rupees(latest.gstPaise)],
                      ["Buyer sees total", `${rupees(latest.totalPaise)} incl. GST and freight`],
                      ["HSN code", latest.lines[0]?.hsn ?? ""],
                      ["Lead time", latest.leadTimeWeeks ? `${String(latest.leadTimeWeeks)} weeks` : ""],
                      ["Delivery terms", latest.deliveryTerms ?? ""],
                      ["Payment schedule", describeSchedule(latest.schedule)],
                      ["Warranty", latest.warrantyMonths ? `${String(latest.warrantyMonths)} months` : ""],
                    ] as [string, string][]
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="type-body-sm text-secondary">{k}</dt>
                        <dd className="type-body-sm">{v}</dd>
                      </div>
                    ))}
                </dl>
              )}
              {sent.length > 1 ? (
                <p className="flex flex-wrap gap-3 type-caption">
                  {sent.slice(0, -1).map((v) => (
                    <span key={v.id} className="inline-flex items-center gap-1">
                      <Icon name="eye" size={14} />v{v.version}: {rupees(v.totalPaise)}, sent{" "}
                      {v.sentAt ? formatIstDayMonth(v.sentAt) : ""}
                    </span>
                  ))}
                </p>
              ) : null}
              {(status === "Sent" || status === "Revised") && open ? (
                <>
                  <div className="rounded-card bg-mint p-3">
                    <p className="type-label">The buyer is comparing quotes</p>
                    <p className="type-caption text-body">
                      {d.rfq.offerDeadline ? `Quotes are due by ${formatIstDateTime(d.rfq.offerDeadline)}. ` : ""}You
                      can revise until the buyer decides; they&apos;re told about each new version.
                    </p>
                  </div>
                  {canQuote ? (
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/supplier/rfqs/${d.rfq.id}?revise=1`}
                        className={buttonClasses({ variant: "outline" })}
                      >
                        <Icon name="pencil" size={16} />
                        Revise quote
                      </Link>
                      {quote ? (
                        <WithdrawQuote rfqId={d.rfq.id} quoteId={quote.id} buyer={d.buyer} version={latest.version} />
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
              {status === "Expired" && open && canQuote ? (
                <Link href={`/supplier/rfqs/${d.rfq.id}?revise=1`} className={buttonClasses({})}>
                  Send a new quote
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <h2 className="type-h3">Your quote</h2>
              <p className="type-body-sm text-body">
                {d.recipient.status === "Declined"
                  ? `You declined this RFQ${d.recipient.declineReason ? `: ${d.recipient.declineReason}` : ""}.`
                  : d.rfq.status === "Closed"
                    ? "This RFQ is closed."
                    : deadlinePassed
                      ? "The offer deadline has passed."
                      : "Only people who can send quotes at your company can quote."}
              </p>
            </>
          )}
        </section>
      </div>
    </SupplierShell>
  );
}
