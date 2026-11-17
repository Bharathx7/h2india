import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { companySettings } from "@h2india/core/buyer";
import { clockDuration } from "@h2india/core/clocks";
import { buyerRfq, compareQuotes, quoteVersion, rfqBadge, type ComparedQuote, type RfqStatus } from "@h2india/core/rfq";
import { describeSchedule } from "@h2india/core/rfq/totals";
import { formatIstDate, formatIstDateTime, formatIstDayMonth } from "@h2india/core/time";
import { isEnabled } from "@h2india/config";
import { Breadcrumbs, buttonClasses, cx, Icon, StatusBadge, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskRevision, CloseRfq, DeclineAll, EditRfq, ExtendDeadline } from "@/buyer/RfqActions";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { MessageDrawer } from "@/messages/MessageDrawer";
import { gstinLabel } from "@h2india/core/companies/client";

// RFQ detail and quote comparison (560:8; phones 562:8), step 9.6: header with the badge and Extend deadline, the
// suppliers' statuses, the comparison with the best value in each row highlighted, the request summary and timeline,
// and the RFQ actions (564:9). Accepting a quote is step 9.8; messages are step 9.7.
export const metadata: Metadata = { title: "RFQ · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const rupees = (p: bigint) => Money.format(p);
const hoursOf = (d: { hours?: number; days?: number; workingDays?: number }) =>
  d.hours ?? (d.days ?? d.workingDays ?? 0) * 24;
const daysTo = (d: Date, now: Date) => Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 86_400_000));

export default async function BuyerRfqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await requireBuyer(`/buyer/rfqs/${id}`);
  const b = page.buyer;
  const db = getDb();
  const scope = scopeFor(page.actor);
  const d = await buyerRfq(db, scope, b.organisationId, id);
  if (!d) notFound();
  const [expiring, settings] = await Promise.all([
    clockDuration(db, "rfqExpiring"),
    companySettings(db, scope, b.organisationId),
  ]);
  const now = new Date();
  const reader = { organisationId: b.organisationId, side: "buyer" as const };
  const quotes = (
    await Promise.all(
      d.quotes
        .filter((q) => q.status !== "Withdrawn")
        .map(async (q) => {
          const v = await quoteVersion(db, scope, reader, q.id);
          const sup = d.suppliers.find((s) => s.rs.organisationId === q.organisationId);
          return v ? { ...v, name: sup?.name ?? sup?.legalName ?? "Supplier" } : null;
        }),
    )
  ).filter((x) => x !== null);
  const compared: ComparedQuote[] = quotes.map((x) => ({
    quoteId: x.quote.id,
    subtotalPaise: x.version.subtotalPaise,
    gstRateBps: x.lines[0]?.gstRateBps ?? null,
    totalPaise: x.version.totalPaise,
    deliveryTerms: x.version.deliveryTerms,
    freightIncluded: x.version.freightIncluded,
    leadTimeWeeks: x.version.leadTimeWeeks,
    validUntil: x.version.validUntil,
    warrantyMonths: x.version.warrantyMonths,
    schedule: x.schedule,
  }));
  const best = compareQuotes(compared).best;
  const badge = rfqBadge(
    {
      status: d.rfq.status as RfqStatus,
      offerDeadline: d.rfq.offerDeadline,
      suppliers: d.suppliers.length,
      quoted: quotes.length,
    },
    hoursOf(expiring) * 3_600_000,
    now,
  );
  const open = d.rfq.status === "Sent" || d.rfq.status === "Quotes received";
  const canAct = b.seat.permissions.has("rfq.create");
  const item = d.items[0];
  const site = settings?.sites.find((s) => s.id === d.rfq.deliverySiteId);
  const approver = settings?.settings?.approverId ?? null;
  const above = settings?.settings?.approvalAbovePaise ?? null;
  const transactions = isEnabled("transactions");
  const deadline = d.rfq.offerDeadline ? formatIstDateTime(d.rfq.offerDeadline) : "";
  const supplierChip = (s: (typeof d.suppliers)[number]) => {
    const quoted = quotes.some((q) => q.quote.organisationId === s.rs.organisationId);
    const word = quoted ? "Quoted" : s.rs.status === "Sent" ? "Not opened" : s.rs.status;
    return { word, strong: quoted };
  };
  const cell = (row: keyof typeof best, quoteId: string) => best[row].ids.includes(quoteId);
  const rows: {
    key: keyof typeof best | null;
    label: string;
    value: (x: (typeof quotes)[number]) => string;
    warn?: (x: (typeof quotes)[number]) => boolean;
  }[] = [
    { key: "price", label: "Price excl. GST", value: (x) => rupees(x.version.subtotalPaise) },
    { key: null, label: "GST rate", value: (x) => (x.lines[0] ? `${String(x.lines[0].gstRateBps / 100)}%` : "—") },
    { key: "total", label: "Total incl. GST", value: (x) => rupees(x.version.totalPaise) },
    { key: "delivery", label: "Delivery terms", value: (x) => x.version.deliveryTerms ?? "—" },
    {
      key: "lead",
      label: "Lead time",
      value: (x) => (x.version.leadTimeWeeks ? `${String(x.version.leadTimeWeeks)} weeks` : "—"),
    },
    {
      key: "validity",
      label: "Quote valid until",
      value: (x) =>
        x.version.validUntil
          ? `${formatIstDate(x.version.validUntil)} · ${String(daysTo(x.version.validUntil, now))} days left`
          : "—",
      warn: (x) => (x.version.validUntil ? daysTo(x.version.validUntil, now) <= 5 : false),
    },
    {
      key: "warranty",
      label: "Warranty",
      value: (x) => (x.version.warrantyMonths ? `${String(x.version.warrantyMonths)} months` : "—"),
    },
    { key: "schedule", label: "Payment schedule", value: (x) => describeSchedule(x.schedule) },
    // Supplier QC, 16 Nov 2026: the supplier GSTIN each quote is issued under (it goes on the invoice).
    // Founder QC (17 Nov 2026): with its state, so the buyer sees which state each quote is invoiced from.
    { key: null, label: "Supplier GSTIN", value: (x) => gstinLabel(x.supplierGstin?.gstin) || "—" },
  ];
  const timeline = [
    { label: `Created · ${formatIstDayMonth(d.rfq.createdAt)}`, done: true },
    ...(d.decisions.some((x) => x.decision === "Approved")
      ? [
          {
            label: `Checked by H2 Economy · ${formatIstDayMonth(d.decisions.find((x) => x.decision === "Approved")?.at ?? now)}`,
            done: true,
          },
        ]
      : []),
    ...(d.rfq.sentAt
      ? [{ label: `Sent to ${String(d.suppliers.length)} suppliers · ${formatIstDayMonth(d.rfq.sentAt)}`, done: true }]
      : []),
    ...(quotes.length
      ? [{ label: `${String(quotes.length)} ${quotes.length === 1 ? "quote" : "quotes"} received`, done: true }]
      : []),
    ...(d.rfq.offerDeadline
      ? [{ label: `Offer deadline · ${deadline}`, done: d.rfq.offerDeadline.getTime() < now.getTime() }]
      : []),
    ...(d.rfq.closedAt ? [{ label: `Closed · ${formatIstDayMonth(d.rfq.closedAt)}`, done: true }] : []),
  ];
  return (
    <BuyerWorkspace page={page} current="/buyer/rfqs">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/buyer" },
          { label: "RFQs", href: "/buyer/rfqs" },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-3 type-h2">
            {d.rfq.reference} · {d.rfq.title}
            <StatusBadge status={badge.label} tone={badge.tone} />
          </h1>
          <p className="type-body-sm text-secondary">
            {[
              d.rfq.offerDeadline ? `Offer deadline ${deadline}` : null,
              open && d.rfq.offerDeadline ? `${String(daysTo(d.rfq.offerDeadline, now))} days left` : null,
              site ? `Deliver to ${[site.name, site.city].filter(Boolean).join(", ")}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {open && canAct ? (
          <div className="flex flex-wrap items-center gap-2">
            <EditRfq
              id={d.rfq.id}
              reference={d.rfq.reference}
              subtitle={d.rfq.title}
              version={d.rfq.version}
              suppliers={d.suppliers.length}
              quoted={quotes.length}
              start={{
                quantity: item?.quantity ?? 1,
                unit: item?.unit ?? "units",
                requiredBy: d.rfq.requiredBy
                  ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d.rfq.requiredBy)
                  : "",
                requirements: d.rfq.requirements ?? "",
              }}
            />
            <ExtendDeadline
              id={d.rfq.id}
              reference={d.rfq.reference}
              current={deadline}
              suppliers={d.suppliers.length}
              today={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now)}
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label">Suppliers</span>
        {d.suppliers.map((s) => {
          const c = supplierChip(s);
          return (
            <span
              key={s.rs.id}
              className={cx("rounded-pill px-2 py-0.5 type-caption", c.strong ? "bg-mint type-label-sm" : "bg-subtle")}
            >
              {s.name ?? s.legalName} · {c.word}
            </span>
          );
        })}
      </div>
      {quotes.length ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Quote comparison"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="text-left align-top">
                <th scope="col" className="w-48 border-b border-default p-4">
                  <span className="block type-label">Compare {quotes.length} quotes</span>
                  {item ? (
                    <span className="block type-caption text-secondary">
                      Prices for {item.quantity} {item.unit}
                    </span>
                  ) : null}
                </th>
                {quotes.map((x) => (
                  <th key={x.quote.id} scope="col" className="border-b border-l border-default p-4">
                    <span className="block type-h4">{x.name}</span>
                    <VerifiedBadge kind="supplier" />
                    <span className="block type-caption text-secondary">
                      {x.quote.status === "Revised" ? `Revised v${String(x.version.version)}` : "Quoted"}{" "}
                      {x.version.sentAt ? formatIstDayMonth(x.version.sentAt) : ""}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="align-top">
                  <th
                    scope="row"
                    className="border-b border-default p-4 text-left type-body-sm font-normal text-secondary"
                  >
                    {r.label}
                  </th>
                  {quotes.map((x) => {
                    const on = r.key ? cell(r.key, x.quote.id) : false;
                    return (
                      <td
                        key={x.quote.id}
                        className={cx(
                          "border-b border-l border-default p-4 type-body-sm",
                          on ? "bg-mint" : "",
                          r.key === "price" || r.key === "total" ? "type-mono" : "",
                        )}
                      >
                        <span className={r.warn?.(x) ? "text-warning" : ""}>{r.value(x)}</span>
                        {on && r.key ? (
                          <span className="mt-1 flex items-center gap-1 type-caption text-success">
                            <Icon name="check-circle" size={12} />
                            {best[r.key].label}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="align-top">
                <th
                  scope="row"
                  className="border-b border-default p-4 text-left type-body-sm font-normal text-secondary"
                >
                  Documents
                </th>
                {quotes.map((x) => (
                  <td key={x.quote.id} className="border-b border-l border-default p-4">
                    {x.version.documents.length ? (
                      <ul className="flex flex-col gap-1">
                        {x.version.documents.map((f, n) => (
                          <li key={f}>
                            <a
                              href={`/api/v1/files/${f}/link`}
                              className="inline-flex items-center gap-1 type-label text-link"
                            >
                              <Icon name="file-text" size={14} />
                              Document {n + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="type-body-sm text-secondary">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4" />
                {quotes.map((x) => (
                  <td key={x.quote.id} className="border-l border-default p-4">
                    <div className="flex flex-wrap gap-2">
                      <MessageDrawer
                        rfqId={d.rfq.id}
                        supplierId={x.quote.organisationId}
                        withName={x.name}
                        ownName={b.legalName}
                        organisationId={b.organisationId}
                        about={`${d.rfq.reference} · ${d.rfq.title}`}
                        inboxHref={`/buyer/messages?rfq=${d.rfq.id}&supplier=${x.quote.organisationId}`}
                      />
                      {open && canAct && (x.quote.status === "Sent" || x.quote.status === "Revised") ? (
                        <Link
                          href={`/buyer/rfqs/${d.rfq.id}/accept/${x.quote.id}`}
                          className={buttonClasses({ size: "sm" })}
                        >
                          Accept quote
                        </Link>
                      ) : (
                        <StatusBadge
                          status={x.quote.status}
                          tone={x.quote.status === "Accepted" ? "success" : "neutral"}
                        />
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <section className="rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">
            {open
              ? "No quotes yet"
              : d.rfq.status === "In moderation"
                ? "H2 Economy is checking this request"
                : "No quotes"}
          </h2>
          <p className="type-body-sm text-body">
            {open
              ? `Suppliers have until ${deadline} to quote. We'll email you as quotes arrive.`
              : d.rfq.status === "In moderation"
                ? "It goes to the suppliers you chose within 1 working day."
                : ""}
          </p>
        </section>
      )}
      {quotes.length && open ? (
        <p className="type-caption text-secondary">
          Accepting a quote creates an order. The other suppliers are told they weren&apos;t selected.
          {above !== null && approver ? ` Orders above ${rupees(above)} go to your approver first.` : ""}
          {transactions ? "" : " Ordering opens soon: you can compare and choose now."}
        </p>
      ) : null}
      {open && canAct ? (
        <div className="flex flex-wrap gap-2">
          {quotes.length ? (
            <AskRevision
              id={d.rfq.id}
              subtitle={`${d.rfq.reference} · ${d.rfq.title}`}
              deadline={deadline}
              quotes={quotes.map((x) => ({
                quoteId: x.quote.id,
                name: x.name,
                label: `${x.name} · ${rupees(x.version.subtotalPaise)} excl. GST${x.version.leadTimeWeeks ? ` · ${String(x.version.leadTimeWeeks)} weeks` : ""}`,
              }))}
            />
          ) : null}
          {quotes.length ? <DeclineAll id={d.rfq.id} names={quotes.map((x) => x.name)} /> : null}
          <CloseRfq id={d.rfq.id} reference={d.rfq.reference} quotes={quotes.length} />
        </div>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Request summary</h2>
          <dl className="grid grid-cols-1 gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
            {(
              [
                ["Quantity", item ? `${String(item.quantity)} ${item.unit}` : ""],
                [
                  "Specification",
                  item && Object.keys(item.specs).length
                    ? Object.entries(item.specs)
                        .map(([k, v]) => `${k} ${String(v)}`)
                        .join(" · ")
                    : "",
                ],
                [
                  "Deliver to",
                  site ? [site.name, site.address, site.city, site.pincode].filter(Boolean).join(", ") : "",
                ],
                ["Needed by", d.rfq.requiredBy ? formatIstDate(d.rfq.requiredBy) : ""],
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
          </dl>
        </section>
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Timeline</h2>
          <ol className="flex flex-col gap-3">
            {timeline.map((t, n) => (
              <li key={t.label} className="flex items-center gap-3">
                <span
                  className={cx(
                    "flex size-6 items-center justify-center rounded-pill type-caption",
                    t.done ? "bg-accent" : "border border-control text-secondary",
                  )}
                >
                  {t.done ? <Icon name="check" size={14} /> : n + 1}
                </span>
                <span className={cx("type-body-sm", t.done ? "type-label" : "text-secondary")}>{t.label}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </BuyerWorkspace>
  );
}
