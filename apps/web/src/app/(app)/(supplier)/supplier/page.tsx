import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { supplierRfqs } from "@h2india/core/rfq";
import {
  buildChecklist,
  canSubmitForReview,
  latestReview,
  productCounts,
  supplierAnalytics,
  supplierFacts,
  type ChecklistItem,
} from "@h2india/core/supplier";
import { formatIstDate, formatIstDayMonth } from "@h2india/core/time";
import { Alert, buttonClasses, cx, Icon, StatusBadge, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "@/news/data";
import { dayMonthYear } from "@/news/format";
import { SubmitReview } from "@/supplier/SubmitReview";
import { requireSupplier, SupplierShell } from "@/supplier/shell";
import { shellFor } from "@/server/workspace";

// Supplier home (step 8.1): the dashboard (584:961; phones 585:536), with the onboarding checklist (584:8; phones 585:15)
// as a card on top until all five steps are done (founder QC, 17 Nov 2026: no steps before the dashboard). Restructured
// in the second founder QC (17 Nov 2026): steps numbered 1 to 5, a summary row (listings, RFQs waiting, quotes sent,
// views), what needs attention (listings to fix, RFQs due) and recent RFQs. All from the supplier's own records.
export const metadata: Metadata = { title: "Supplier · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

/** A step's marker: a tick when done, else its number (1 to 5); the next step to do is filled. */
function Step({ item, number, current }: { item: ChecklistItem; number: number; current: boolean }) {
  return (
    <span
      className={cx(
        "flex size-7 shrink-0 items-center justify-center rounded-pill type-label",
        item.state === "done"
          ? "bg-accent text-primary"
          : item.state === "checking" || current
            ? "bg-inverse text-inverse"
            : "border-[1.5px] border-control text-secondary",
      )}
    >
      {item.state === "done" ? <Icon name="check" size={16} /> : <>{number}</>}
      <span className="sr-only">
        {item.state === "done" ? " done" : item.state === "checking" ? " being checked" : " to do"}
      </span>
    </span>
  );
}

const greeting = (now: Date) => {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(now),
  );
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default async function SupplierHome() {
  const page = await requireSupplier("/supplier");
  const db = getDb();
  const s = page.supplier;
  const scope = scopeFor(page.actor);
  const [facts, counts, rfqs, views, review] = await Promise.all([
    supplierFacts(db, s.organisationId),
    productCounts(db, s.organisationId),
    supplierRfqs(db, scope, s.organisationId),
    supplierAnalytics(db, scope, s.organisationId).catch(() => null),
    latestReview(db, scope, s.organisationId),
  ]);
  const checklist = buildChecklist(facts);
  // Only a company admin may submit for review (core refuses anyone else).
  const maySubmit = s.seat.permissions.has("company.manage");
  // The review's answer when H2 Economy sent it back, with its reason (founder: the dashboard never showed it).
  const sentBack = review?.status === "Changes requested" && s.verification !== "Verified" ? review : null;
  // "Verification in progress" only once something has gone to H2 Economy: documents or the review.
  const inProgress =
    !sentBack && s.verification !== "Verified" && (facts.documents.uploaded > 0 || facts.review === "submitted");
  const now = new Date().getTime();
  // RFQs that still wait for this supplier's quote, and those due within a day.
  const waiting = rfqs.filter(
    (x) =>
      (x.recipient.status === "Sent" || x.recipient.status === "Viewed") &&
      (x.rfq.status === "Sent" || x.rfq.status === "Quotes received") &&
      (!x.rfq.offerDeadline || x.rfq.offerDeadline.getTime() > now),
  );
  const dueSoon = waiting.filter((x) => x.rfq.offerDeadline && x.rfq.offerDeadline.getTime() - now < 86_400_000);
  const quotesSent = rfqs.filter((x) => x.quote?.sentVersion).length;

  // Founder QC (17 Nov 2026): the dashboard shows from the first visit. Until the five steps are done they sit on top of
  // it as a card (584:8's rows), so Submit for review stays where it was.
  const firstOpen = checklist.items.findIndex((i) => i.state === "todo");
  const setup = checklist.complete ? null : (
    <section aria-labelledby="setup" className="flex flex-col gap-4">
      {sentBack ? (
        <Alert tone="warning" title="H2 Economy asked for changes before verifying you">
          {sentBack.reason ?? "Check the documents marked in Verification and send them again."}
          {sentBack.decidedAt ? (
            <span className="block type-caption">Reviewed {formatIstDate(sentBack.decidedAt)}</span>
          ) : null}
          <Link href="/supplier/verification" className="mt-1 inline-flex type-label text-link underline">
            Open Verification
          </Link>
        </Alert>
      ) : inProgress ? (
        <Alert tone="info" title="Verification in progress">
          You can keep drafting. Publishing unlocks after H2 Economy approves your company.
        </Alert>
      ) : null}
      <div>
        <h2 id="setup" className="type-h3">
          Set up {s.tradeName} on H2 Economy
        </h2>
        <p className="type-body-sm text-secondary">
          Five steps to go live. Buyers can find you once your company and first listing are approved.
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="progress" className="rounded-card border border-default bg-page">
          <div className="flex flex-col gap-2 border-b border-default p-5">
            <div className="flex items-baseline justify-between">
              <h3 id="progress" className="type-h4">
                {checklist.done} of {checklist.total} done
              </h3>
              <span className="type-label text-secondary">{Math.round((checklist.done / checklist.total) * 100)}%</span>
            </div>
            <div
              role="progressbar"
              aria-labelledby="progress"
              aria-valuemin={0}
              aria-valuemax={checklist.total}
              aria-valuenow={checklist.done}
              className="h-1.5 overflow-hidden rounded-pill bg-subtle"
            >
              <div
                className="h-full rounded-pill bg-accent"
                style={{ width: `${String((checklist.done / checklist.total) * 100)}%` }}
              />
            </div>
          </div>
          <ol>
            {checklist.items.map((item, i) => (
              <li
                key={item.key}
                className="grid grid-cols-1 items-center gap-3 border-b border-default p-5 last:border-0 md:grid-cols-[auto_200px_minmax(0,1fr)_auto]"
              >
                <Step item={item} number={i + 1} current={i === firstOpen} />
                <h4 className="type-label text-primary">{item.title}</h4>
                <div className="flex flex-col gap-2 type-body-sm text-body">
                  <p>{item.detail}</p>
                  {item.key === "product" && item.state === "todo" ? (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/supplier/products/new?from=datasheet"
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        <Icon name="upload" size={16} />
                        Upload datasheet
                      </Link>
                      <Link href="/supplier/products/new" className={buttonClasses({ size: "sm" })}>
                        <Icon name="plus" size={16} />
                        Add product
                      </Link>
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-end">
                  {item.key === "review" ? (
                    item.state === "todo" ? (
                      <SubmitReview ready={canSubmitForReview(checklist)} allowed={maySubmit} />
                    ) : item.badge ? (
                      <StatusBadge status={item.badge} tone="progress" />
                    ) : null
                  ) : item.key === "storefront" && item.state === "done" ? (
                    <Link href="/supplier/storefront" className="type-label text-primary hover:underline">
                      Edit
                    </Link>
                  ) : item.action ? (
                    <span className="flex flex-wrap items-center justify-end gap-3">
                      {item.badge && item.state === "checking" ? (
                        <StatusBadge status={item.badge} tone="progress" />
                      ) : null}
                      <Link href={item.action.href} className="type-label text-link underline">
                        {item.action.label}
                      </Link>
                    </span>
                  ) : item.key === "storefront" ? (
                    <Link href="/supplier/storefront" className="type-label text-link underline">
                      Set up
                    </Link>
                  ) : item.badge ? (
                    <StatusBadge status={item.badge} tone={item.state === "done" ? "success" : "progress"} />
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <aside className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
          <h3 className="type-h4">What buyers will see</h3>
          <p className="type-body-sm text-body">
            After approval, your storefront, quotes and listings show these badges.
          </p>
          <div className="flex flex-wrap gap-2">
            <VerifiedBadge kind="supplier" />
            <VerifiedBadge kind="gst" />
          </div>
        </aside>
      </div>
    </section>
  );

  const shell = await shellFor(page.userId);
  const articles = (await listArticles({ limit: 40 })).items
    .filter((a) => `${a.title} ${a.dek}`.toLowerCase().includes(s.tradeName.toLowerCase()))
    .slice(0, 2);
  const attention = [
    dueSoon.length
      ? {
          icon: "clock" as const,
          title: `${String(dueSoon.length)} ${dueSoon.length === 1 ? "RFQ closes" : "RFQs close"} within 24 hours`,
          sub: dueSoon
            .slice(0, 2)
            .map((x) => `${x.rfq.reference} · ${x.buyer}`)
            .join(" · "),
          href: "/supplier/rfqs",
          action: "Send a quote",
        }
      : null,
    waiting.length > dueSoon.length
      ? {
          icon: "file-text" as const,
          title: `${String(waiting.length - dueSoon.length)} ${waiting.length - dueSoon.length === 1 ? "RFQ waits" : "RFQs wait"} for your quote`,
          sub: "Buyers compare the quotes they get; quoting early helps.",
          href: "/supplier/rfqs",
          action: "Open RFQs",
        }
      : null,
    counts.needsChanges
      ? {
          icon: "pencil" as const,
          title: `${String(counts.needsChanges)} ${counts.needsChanges === 1 ? "product needs" : "products need"} changes`,
          sub: counts.needsChangesNames.slice(0, 2).join(" · "),
          href: "/supplier/products?tab=needs-changes",
          action: "Fix listing",
        }
      : null,
  ].filter((x) => x !== null);
  return (
    <SupplierShell page={page} current="/supplier" title="Dashboard">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">
            {greeting(new Date())}, {shell.user.name.split(" ")[0]}
          </h1>
          <p className="flex flex-wrap items-center gap-2 type-body-sm text-secondary">
            {[s.legalName, s.city].filter(Boolean).join(" · ")}
            {s.verification === "Verified" ? <VerifiedBadge kind="supplier" /> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/supplier/rfqs" className={buttonClasses({ variant: "outline" })}>
            <Icon name="file-text" size={18} />
            RFQs
          </Link>
        </div>
      </div>
      {setup}
      <ul aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            value: counts.live,
            label: "Live listings",
            sub: `${String(counts.inReview)} in review · ${String(counts.needsChanges)} need changes`,
            href: "/supplier/products",
          },
          {
            value: waiting.length,
            label: "RFQs waiting for your quote",
            sub: dueSoon.length ? `${String(dueSoon.length)} close within 24 hours` : "None close today",
            href: "/supplier/rfqs",
          },
          {
            value: quotesSent,
            label: "Quotes sent",
            sub: `To ${String(rfqs.length)} RFQs in all`,
            href: "/supplier/rfqs",
          },
          {
            value: views?.views ?? 0,
            label: "Listing views, 30 days",
            sub:
              views?.viewsChange === null || views?.viewsChange === undefined
                ? "Compared with the 30 days before"
                : `${views.viewsChange >= 0 ? "+" : ""}${String(views.viewsChange)}% on the 30 days before`,
            href: "/supplier/analytics",
          },
        ].map((k) => (
          <li key={k.label}>
            <Link
              href={k.href}
              className="flex h-full flex-col gap-1 rounded-card border border-default bg-page p-5 hover:border-focus"
            >
              <span className="type-h2 tabular-nums">{k.value.toLocaleString("en-IN")}</span>
              <span className="type-label text-primary">{k.label}</span>
              <span className="type-caption text-secondary">{k.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="attention" className="rounded-card border border-default bg-page">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default p-5">
            <h2 id="attention" className="type-h4">
              Needs your attention
            </h2>
            <span className="type-caption text-secondary">Amber: due within 24 hours · Red: overdue</span>
          </div>
          {attention.length ? (
            <ul>
              {attention.map((a) => (
                <li
                  key={a.title}
                  className="flex flex-wrap items-center gap-4 border-b border-default p-5 last:border-0"
                >
                  <span className="flex size-9 items-center justify-center rounded-control bg-subtle">
                    <Icon name={a.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="type-label text-primary">{a.title}</p>
                    <p className="type-caption text-secondary">{a.sub}</p>
                  </div>
                  <Link href={a.href} className="inline-flex items-center gap-1.5 type-label text-link">
                    {a.action}
                    <Icon name="arrow-right" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 type-body-sm text-body">Nothing needs you right now.</p>
          )}
        </section>
        <section aria-labelledby="recent-rfqs" className="rounded-card border border-default bg-page">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default p-5">
            <h2 id="recent-rfqs" className="type-h4">
              Recent RFQs
            </h2>
            <Link href="/supplier/rfqs" className="type-label text-link underline">
              See all
            </Link>
          </div>
          {rfqs.length ? (
            <ul>
              {rfqs.slice(0, 5).map((x) => (
                <li
                  key={x.rfq.id}
                  className="flex flex-wrap items-center gap-3 border-b border-default p-4 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <Link href={`/supplier/rfqs/${x.rfq.id}`} className="type-label text-primary hover:underline">
                      {x.rfq.title || x.rfq.reference}
                    </Link>
                    <p className="type-caption text-secondary">
                      {[x.rfq.reference, x.buyer, x.quantity, x.rfq.sentAt ? formatIstDayMonth(x.rfq.sentAt) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <StatusBadge
                    status={
                      x.quote?.sentVersion ? "Quoted" : x.recipient.status === "Declined" ? "Declined" : "Waiting"
                    }
                    tone={x.quote?.sentVersion ? "success" : x.recipient.status === "Declined" ? "neutral" : "warning"}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 type-body-sm text-body">
              RFQs from buyers show here once your company and a listing are approved.
            </p>
          )}
        </section>
      </div>
      {articles.length ? (
        <section
          aria-labelledby="news"
          className="flex flex-col gap-3 rounded-card border border-default bg-page p-5 lg:max-w-sm"
        >
          <h2 id="news" className="type-h4">
            Mentioned in news
          </h2>
          <ul className="flex flex-col divide-y divide-default">
            {articles.map((a) => (
              <li key={a.id} className="py-3">
                <p className="type-label-sm text-secondary">
                  {a.typeLabel} · {dayMonthYear(a.publishedAt)}
                </p>
                <Link href={a.href} className="type-label text-primary hover:underline">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </SupplierShell>
  );
}
