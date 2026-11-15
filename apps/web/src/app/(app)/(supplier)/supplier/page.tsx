import { getDb } from "@h2india/core";
import { productCounts, supplierChecklist, canSubmitForReview, type ChecklistItem } from "@h2india/core/supplier";
import { Alert, buttonClasses, cx, Icon, StatusBadge, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "@/news/data";
import { dayMonthYear } from "@/news/format";
import { SubmitReview } from "@/supplier/SubmitReview";
import { requireSupplier, SupplierShell } from "@/supplier/shell";
import { shellFor } from "@/server/workspace";

// Supplier home (step 8.1): the onboarding checklist (584:8; phones 585:15) until all five steps are done, then the
// dashboard (584:961; phones 585:536). Both read the supplier's own records only. Order cards wait for transactions.
export const metadata: Metadata = { title: "Supplier · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

function Step({ item, index }: { item: ChecklistItem; index: number }) {
  return (
    <span
      className={cx(
        "flex size-7 shrink-0 items-center justify-center rounded-pill type-label",
        item.state === "done"
          ? "bg-accent text-primary"
          : item.state === "checking" || index === 0
            ? "bg-inverse text-inverse"
            : "border-[1.5px] border-control text-secondary",
      )}
    >
      {item.state === "done" ? <Icon name="check" size={16} /> : <>{index + 1}</>}
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
  const [checklist, counts] = await Promise.all([
    supplierChecklist(db, s.organisationId),
    productCounts(db, s.organisationId),
  ]);

  if (!checklist.complete) {
    const firstOpen = checklist.items.findIndex((i) => i.state === "todo");
    return (
      <SupplierShell page={page} current="/supplier" title="Getting started">
        {s.verification !== "Verified" ? (
          <Alert tone="success" title="Verification in progress">
            You can keep drafting. Publishing unlocks after H2 India approves your company.
          </Alert>
        ) : null}
        <div>
          <h1 className="type-h2">Set up {s.tradeName} on H2 India</h1>
          <p className="type-body-sm text-secondary">
            Five steps to go live. Buyers can find you once your company and first listing are approved.
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
              {checklist.items.map((item, i) => (
                <li
                  key={item.key}
                  className="grid grid-cols-1 items-center gap-3 border-b border-default p-5 last:border-0 md:grid-cols-[auto_200px_minmax(0,1fr)_auto]"
                >
                  <Step item={item} index={i === firstOpen ? 0 : i + 1} />
                  <h3 className="type-label text-primary">{item.title}</h3>
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
                        <SubmitReview ready={canSubmitForReview(checklist)} />
                      ) : item.badge ? (
                        <StatusBadge status={item.badge} tone="progress" />
                      ) : null
                    ) : item.key === "storefront" && item.state === "done" ? (
                      <Link href="/supplier/storefront" className="type-label text-primary hover:underline">
                        Edit
                      </Link>
                    ) : item.key === "bank" && item.state === "todo" ? (
                      <Link href="/supplier/bank" className="type-label text-link underline">
                        Add account
                      </Link>
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
            <h2 className="type-h4">What buyers will see</h2>
            <p className="type-body-sm text-body">
              After approval, your storefront, quotes and listings show these badges.
            </p>
            <div className="flex flex-wrap gap-2">
              <VerifiedBadge kind="supplier" />
              <VerifiedBadge kind="gst" />
            </div>
          </aside>
        </div>
      </SupplierShell>
    );
  }

  const shell = await shellFor(page.userId);
  const articles = (await listArticles({ limit: 40 })).items
    .filter((a) => `${a.title} ${a.dek}`.toLowerCase().includes(s.tradeName.toLowerCase()))
    .slice(0, 2);
  const attention = [
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
      <div>
        <h1 className="type-h2">
          {greeting(new Date())}, {shell.user.name.split(" ")[0]}
        </h1>
        <p className="flex flex-wrap items-center gap-2 type-body-sm text-secondary">
          {[s.legalName, s.city].filter(Boolean).join(" · ")}
          {s.verification === "Verified" ? <VerifiedBadge kind="supplier" /> : null}
        </p>
      </div>
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
              <li key={a.title} className="flex flex-wrap items-center gap-4 border-b border-default p-5 last:border-0">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-card bg-mint p-6">
          <p className="type-display text-primary">{counts.live}</p>
          <p className="type-label text-primary">Live listings</p>
          <p className="type-caption text-secondary">
            {counts.inReview} in review · {counts.needsChanges} needs changes
          </p>
        </div>
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
                <p className="type-eyebrow text-secondary">
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
