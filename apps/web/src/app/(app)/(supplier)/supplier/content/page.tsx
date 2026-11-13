import config from "@payload-config";
import { formatIstDayMonth } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Icon, StatusBadge, type BadgeTone } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Content submissions (592:916; phones 594:843), step 8.7: press releases and events the company sent through the
// public forms (step 5.7, the Content queue) and the jobs it posted (step 5.5). Editors review each before it's
// published; their note shows here.
export const metadata: Metadata = { title: "Content · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

interface Row {
  key: string;
  title: string;
  type: "Press release" | "Event" | "Job";
  status: "Draft" | "Under review" | "Published" | "Needs changes" | "Declined";
  note: string | null;
  sub: string | null;
  updated: Date;
  href: string | null;
  action: string | null;
}

const TONE: Record<Row["status"], BadgeTone> = {
  Draft: "neutral",
  "Under review": "progress",
  Published: "success",
  "Needs changes": "warning",
  Declined: "error",
};
const TABS = [
  { key: "all", label: "All" },
  { key: "drafts", label: "Drafts" },
  { key: "review", label: "Under review" },
  { key: "published", label: "Published" },
] as const;
const TYPES = [
  { key: "", label: "All types" },
  { key: "Press release", label: "Press releases" },
  { key: "Event", label: "Events" },
  { key: "Job", label: "Jobs" },
] as const;

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/content");
  const org = page.supplier.organisationId;
  const p = await getPayload({ config });
  const [subs, jobs] = await Promise.all([
    p.find({
      collection: "submissions",
      where: { and: [{ organisationId: { equals: org } }, { kind: { in: ["press_release", "event"] } }] },
      sort: "-updatedAt",
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
    p.find({
      collection: "jobs",
      where: { "post.organisationId": { equals: org } },
      sort: "-updatedAt",
      limit: 100,
      depth: 0,
      draft: true,
      overrideAccess: true,
    }),
  ]);
  const rows: Row[] = [
    ...subs.docs.map((s): Row => {
      const status = (
        s.status === "Published" || s.status === "Needs changes" || s.status === "Declined" ? s.status : "Under review"
      ) as Row["status"];
      return {
        key: `s${String(s.id)}`,
        title: s.title,
        type: s.kind === "event" ? "Event" : "Press release",
        status,
        note: s.reviewNote ?? null,
        sub: s.reference,
        updated: new Date(s.updatedAt),
        href: null,
        action: status === "Needs changes" || status === "Declined" ? "Read feedback" : null,
      };
    }),
    ...jobs.docs.map((j): Row => {
      const live = j._status === "published";
      return {
        key: `j${String(j.id)}`,
        title: j.role,
        type: "Job",
        status: live ? "Published" : "Under review",
        note: null,
        sub: `Closes ${formatIstDayMonth(new Date(j.closesAt))}`,
        updated: new Date(j.updatedAt),
        href: live ? `/opportunities/jobs/${j.slug}` : null,
        action: live ? "View" : null,
      };
    }),
  ].sort((a, b) => b.updated.getTime() - a.updated.getTime());
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "all";
  const inTab = (r: Row) =>
    tab === "all" ||
    (tab === "drafts"
      ? r.status === "Draft"
      : tab === "review"
        ? r.status === "Under review" || r.status === "Needs changes"
        : r.status === "Published");
  const shown = rows.filter((r) => inTab(r) && (!sp.type || r.type === sp.type));
  const count = (k: (typeof TABS)[number]["key"]) =>
    rows.filter(
      (r) =>
        k === "all" ||
        (k === "drafts"
          ? r.status === "Draft"
          : k === "review"
            ? r.status === "Under review" || r.status === "Needs changes"
            : r.status === "Published"),
    ).length;
  return (
    <SupplierShell page={page} current="/supplier/content" title="Content">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Content</h1>
          <p className="type-body-sm text-secondary">
            Press releases, events and jobs you send to H2 India. Our editors review each one before it&apos;s
            published.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/legal/editorial-policy" className="type-label">
            Editorial policy
          </Link>
          <Link href="/news/submit" className={buttonClasses({ variant: "outline", size: "sm" })}>
            <Icon name="plus" size={16} />
            Press release
          </Link>
          <Link href="/events/submit" className={buttonClasses({ variant: "outline", size: "sm" })}>
            <Icon name="plus" size={16} />
            Event
          </Link>
          <Link href="/opportunities/jobs/post" className={buttonClasses({ size: "sm" })}>
            <Icon name="plus" size={16} />
            Job
          </Link>
        </div>
      </div>
      <nav aria-label="Status" className="flex gap-5 border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/supplier/content?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 type-label",
              tab === t.key ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{count(t.key)}</span>
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <Link
            key={t.key}
            href={`/supplier/content?tab=${tab}${t.key ? `&type=${encodeURIComponent(t.key)}` : ""}`}
            aria-current={(sp.type ?? "") === t.key ? "page" : undefined}
            className={cx(
              "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
              (sp.type ?? "") === t.key ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {shown.length ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Your content"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Title
                </th>
                <th scope="col" className="px-2 py-3">
                  Type
                </th>
                <th scope="col" className="px-2 py-3">
                  Status
                </th>
                <th scope="col" className="px-2 py-3">
                  Updated
                </th>
                <th scope="col" className="px-2 py-3">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.key} className="border-t border-default align-top">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="block type-label">{r.title}</span>
                    {r.note ? (
                      <span
                        className={
                          r.status === "Declined" ? "block type-caption text-error" : "block type-caption text-warning"
                        }
                      >
                        {r.note}
                      </span>
                    ) : r.sub ? (
                      <span className="block type-caption text-secondary">{r.sub}</span>
                    ) : null}
                  </th>
                  <td className="px-2 py-3 type-body-sm">{r.type}</td>
                  <td className="px-2 py-3">
                    <StatusBadge status={r.status} tone={TONE[r.status]} />
                  </td>
                  <td className="px-2 py-3 type-body-sm">{formatIstDayMonth(r.updated)}</td>
                  <td className="px-2 py-3 text-right">
                    {r.href && r.action ? (
                      <Link href={r.href} className="type-label">
                        {r.action}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="Nothing here yet">
            Send a press release, an event or a job, and it shows here while our editors review it.
          </EmptyState>
        </div>
      )}
    </SupplierShell>
  );
}
