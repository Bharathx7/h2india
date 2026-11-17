import { isEnabled } from "@h2india/config";
import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { listOrders } from "@h2india/core/orders";
import { formatIstDate } from "@h2india/core/time";
import { buyerChecklist } from "@h2india/core/buyer";
import { companyRoles } from "@h2india/core/supplier";
import { listAlerts } from "@h2india/core/members";
import { buyerRfqs } from "@h2india/core/rfq";
import { Alert, buttonClasses, cx, Icon, StatusBadge, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { buildFeed } from "@/member/feed";

// Buyer home (step 9.1): the onboarding checklist (553:8; phones 555:15) until all five steps are done, then the
// dashboard (554:8; phones 555:445; first use 554:483). Public QC, 16 Nov 2026: the checklist shows only while the
// buyerChecklist switch is on (off by default), so buyers go straight to the dashboard until the steps are chosen. Quote, order and spend figures fill in from steps 9.2 to 10.
export const metadata: Metadata = { title: "Buyer · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const LINK: Record<string, { href: string; label: string; primary?: boolean }> = {
  gstin: { href: "/buyer/company?section=gstins", label: "Add GSTIN" },
  site: { href: "/buyer/company?section=sites", label: "Add a site" },
  colleagues: { href: "/buyer/company?section=users", label: "Invite colleagues", primary: true },
  rules: { href: "/buyer/company?section=rules", label: "Set rules" },
  rfq: { href: "/rfq/new", label: "Request a quote" },
};

export default async function BuyerHome() {
  const page = await requireBuyer("/buyer");
  const db = getDb();
  const b = page.buyer;
  const [checklist, roles, alerts, feed, rfqs] = await Promise.all([
    buyerChecklist(db, b.organisationId),
    companyRoles(db, b.organisationId),
    listAlerts(db, page.userId),
    buildFeed(page.userId),
    buyerRfqs(db, scopeFor(page.actor), b.organisationId),
  ]);
  // Founder QC (17 Nov 2026): Recent activity shows the company's latest quote requests instead of a placeholder.
  const recent = rfqs.slice(0, 5);
  if (isEnabled("buyerChecklist") && !checklist.complete) {
    const next = checklist.items.findIndex((i) => i.state === "todo");
    return (
      <BuyerWorkspace page={page} current="/buyer">
        <div>
          <h1 className="type-h2">Set up {b.legalName} on H2 Economy</h1>
          <p className="type-body-sm text-secondary">
            Finish these steps so your team can request quotes, approve and place orders.
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section aria-labelledby="progress" className="rounded-card border border-default bg-page">
            <div className="flex flex-col gap-2 border-b border-default p-5">
              <div className="flex items-baseline justify-between">
                <h2 id="progress" className="type-h3">
                  {checklist.done} of {checklist.total} done
                </h2>
                <span className="type-label text-secondary">
                  {Math.round((checklist.done / checklist.total) * 100)}%
                </span>
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
              {checklist.items.map((item, i) => {
                const link = LINK[item.key];
                return (
                  <li
                    key={item.key}
                    className="grid grid-cols-1 items-center gap-3 border-b border-default p-5 md:grid-cols-[auto_200px_minmax(0,1fr)_auto]"
                  >
                    <span
                      className={cx(
                        "flex size-7 items-center justify-center rounded-pill type-label",
                        item.state === "done"
                          ? "bg-accent"
                          : i === next
                            ? "bg-inverse text-inverse"
                            : "border-[1.5px] border-control text-secondary",
                      )}
                    >
                      {item.state === "done" ? <Icon name="check" size={16} /> : i + 1}
                    </span>
                    <h3 className="type-label">{item.title}</h3>
                    <p className="type-body-sm text-body">{item.detail}</p>
                    <span className="flex justify-end">
                      {item.state === "done" ? (
                        item.badge === "GST verified" ? (
                          <VerifiedBadge kind="gst" />
                        ) : item.key === "site" ? (
                          <Link href="/buyer/company?section=sites" className="type-label">
                            Edit
                          </Link>
                        ) : null
                      ) : item.badge ? (
                        <StatusBadge status={item.badge} tone="progress" />
                      ) : link ? (
                        <Link
                          href={link.href}
                          className={buttonClasses({ variant: i === next ? "primary" : "outline", size: "sm" })}
                        >
                          {link.label}
                        </Link>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="p-5 type-caption text-secondary">You can hide this checklist once all 5 steps are done.</p>
          </section>
          <aside className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Roles you can give colleagues</h2>
            <dl className="flex flex-col gap-3">
              {roles.map((r) => (
                <div key={r.name}>
                  <dt className="type-label">{r.name}</dt>
                  <dd className="type-caption text-secondary">{r.description}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </BuyerWorkspace>
    );
  }
  const opportunities = feed.items.filter((x) => x.kind === "tender" || x.kind === "scheme").slice(0, 2);
  // Payment due banner (721:24597): the first order with a payment due, while ordering is on.
  const dueOrder = isEnabled("transactions")
    ? (await listOrders(scopeFor(page.actor), db, { organisationId: b.organisationId, side: "buyer" })).find(
        (o) => o.due,
      )
    : undefined;
  return (
    <BuyerWorkspace page={page} current="/buyer">
      <div>
        <h1 className="type-h2">Dashboard</h1>
        <p className="type-body-sm text-secondary">{[b.legalName, b.city, b.state].filter(Boolean).join(" · ")}</p>
      </div>
      {dueOrder?.due ? (
        <Alert
          tone={dueOrder.due.dueAt && dueOrder.due.dueAt.getTime() < new Date().getTime() ? "error" : "warning"}
          title={`${Money.format(dueOrder.due.amountPaise)} is due on ${dueOrder.reference}${dueOrder.due.dueAt ? ` by ${formatIstDate(dueOrder.due.dueAt)}` : ""}`}
          action={
            <Link href={`/buyer/orders/${dueOrder.id}`} className="type-label underline">
              Pay now
            </Link>
          }
        >
          {dueOrder.supplierName} is waiting for it before the next step. It&apos;s held in escrow until you accept the
          delivery.
        </Alert>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="type-h4">Recent quote requests</h2>
            {recent.length ? (
              <Link href="/buyer/rfqs" className="type-label text-link">
                All RFQs
              </Link>
            ) : null}
          </div>
          {recent.length ? (
            <ul className="flex flex-col divide-y divide-default">
              {recent.map((x) => {
                const draft = x.rfq.status === "Draft" || x.rfq.status === "Returned";
                return (
                  <li key={x.rfq.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={draft ? `/rfq/new?draft=${x.rfq.id}` : `/buyer/rfqs/${x.rfq.id}`}
                        className="block truncate type-label text-primary hover:underline"
                      >
                        {x.rfq.title || "Untitled request"}
                      </Link>
                      <span className="block type-caption text-secondary">
                        {x.rfq.reference} · {formatIstDate(x.rfq.createdAt)}
                        {draft ? "" : ` · ${String(x.quoted)} of ${String(x.suppliers)} quoted`}
                      </span>
                    </div>
                    <StatusBadge status={x.rfq.status} tone={x.quoted ? "success" : draft ? "neutral" : "progress"} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="type-body-sm text-body">
              Your quote requests and the quotes suppliers send show here. Start with what you need.
            </p>
          )}
          <Link href="/rfq/new" className={buttonClasses({ size: "sm" }) + " self-start"}>
            Request a quote
          </Link>
        </section>
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Saved search alerts</h2>
            {alerts.length ? (
              <ul className="flex flex-col gap-2">
                {alerts.slice(0, 3).map((a) => (
                  <li key={a.id} className="type-body-sm">
                    {a.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-body-sm text-body">No alerts yet.</p>
            )}
            <Link href="/buyer/alerts" className="inline-flex items-center gap-1.5 type-label text-link">
              Manage alerts
              <Icon name="arrow-right" size={16} />
            </Link>
          </section>
          {opportunities.length ? (
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">Tenders and schemes for you</h2>
              {opportunities.map((o) => (
                <div key={o.key} className="border-t border-default pt-3">
                  <p className="type-eyebrow text-secondary">{o.kind}</p>
                  <Link href={o.href} className="type-label hover:underline">
                    {o.title}
                  </Link>
                  <p className="type-caption text-secondary">{o.meta}</p>
                </div>
              ))}
              <Link href="/opportunities" className="inline-flex items-center gap-1.5 type-label text-link">
                See all opportunities
                <Icon name="arrow-right" size={16} />
              </Link>
            </section>
          ) : null}
        </div>
      </div>
    </BuyerWorkspace>
  );
}
