import { getDb } from "@h2india/core";
import { companyDocuments } from "@h2india/core/search";
import { Breadcrumbs, buttonClasses, cx, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { STATE_OPTIONS } from "@/cms/records/common";
import { schemeStatus } from "@/cms/records/status";
import { showSample } from "@/cms/sample";
import { INCENTIVE_CATEGORIES } from "@/cms/tracker/collections";
import { listArticles } from "@/news/data";
import { dayMonthYear } from "@/news/format";
import { wrap } from "@/news/parts";
import { stateData } from "@/schemes/data";
import { StateTabs } from "@/schemes/StateTabs";

// A state's hydrogen page (751:7362 Maharashtra, step 5.4): its policy and incentives, projects from the tracker,
// companies, open tenders and schemes, hubs and valleys, and news. "Get <state> alerts" comes with alerts (step 7.3).

type Params = Promise<{ state: string }>;

const known = (v: string) => STATE_OPTIONS.some((o) => o.value === v && v !== "all-india");

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { state } = await params;
  const name = STATE_OPTIONS.find((o) => o.value === state)?.label;
  if (!name || !known(state)) return { title: "Not found · H2 India" };
  return {
    title: `Hydrogen in ${name} · H2 India`,
    description: `Policy, projects, companies, tenders and news for ${name}.`,
    alternates: { canonical: `/states/${state}` },
  };
}

function Card({
  title,
  sub,
  children,
  className,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cx("flex flex-col gap-4 rounded-card border border-default bg-page p-5", className)}
    >
      <div className="flex flex-col gap-1">
        <h2 className="type-h4 text-primary">{title}</h2>
        {sub ? <p className="type-caption text-secondary">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

const linkRow = "flex flex-col gap-0.5 border-t border-default pt-3 first:border-0 first:pt-0";

export default async function StatePage({ params }: { params: Params }) {
  const { state } = await params;
  if (!known(state)) notFound();
  const now = new Date();
  const data = await stateData(state, now);
  const [companies, news] = await Promise.all([
    companyDocuments(getDb(), { includeSample: showSample() }),
    listArticles({ state, stateOnly: true, limit: 3, notTypes: ["press_release"] }),
  ]);
  const local = companies.filter((c) => c.state === data.name);
  const openSchemes = data.schemes.filter((s) => {
    const st = schemeStatus({ nextDeadline: s.nextDeadline, override: s.statusOverride }, now);
    return st === "Open" || st === "Closing soon";
  });
  const p = data.policy;
  const incentives = INCENTIVE_CATEGORIES.filter((c) => c !== "Other").map((category) => {
    const row = (p?.incentives ?? []).find((i) => i.category === category);
    return { category, for: row?.for ?? null, summary: row?.summary ?? null };
  });
  const asOf = p?.verification?.at ?? p?.updatedAt ?? null;
  const tiles = [
    { value: data.projectCount, label: "projects in the tracker" },
    { value: local.length, label: "companies on H2 India" },
    { value: data.tenders.length, label: "open tenders" },
    { value: openSchemes.length, label: `open ${openSchemes.length === 1 ? "scheme" : "schemes"}` },
  ];

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-4 pt-6 md:pt-8")}>
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "States", href: "/states/compare" }, { label: data.name }]}
          renderLink={(c, className) => (
            <Link href={c.href} className={className}>
              {c.label}
            </Link>
          )}
        />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="type-h1 text-primary">Hydrogen in {data.name}</h1>
            <p className="type-body text-body">
              Policy, projects, companies, tenders and news for one state.
              {asOf ? ` Data as of ${dayMonthYear(asOf)}.` : ""}
            </p>
          </div>
          <Link href={`/states/compare?s=${state}`} className={buttonClasses({ variant: "outline" })}>
            Compare states
          </Link>
        </div>
        <StateTabs active="overview" state={state} />
      </div>

      <div className={cx(wrap, "flex flex-col gap-6 py-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((t) => (
              <li key={t.label} className="flex flex-col gap-1 rounded-card bg-subtle p-3.5">
                <span className="type-h3 text-primary">{t.value}</span>
                <span className="type-caption text-secondary">{t.label}</span>
              </li>
            ))}
          </ul>

          <Card title="State policy">
            {p ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="type-label text-primary">
                    {data.name} {p.policy}, {p.year}
                  </p>
                  <p className="type-body-sm text-body">{p.summary ?? p.keyIncentives}</p>
                </div>
                <a
                  href={p.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx(buttonClasses({ variant: "outline", size: "sm" }), "shrink-0")}
                >
                  <Icon name="external-link" size={16} />
                  Read the policy<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            ) : (
              <p className="type-body-sm text-secondary">No state hydrogen policy is in the tracker yet.</p>
            )}
          </Card>

          {p ? (
            <Card title="Incentives" sub={`Summaries only. "Not specified" means the policy doesn't say.`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 text-left">
                  <thead className="bg-subtle type-label-sm text-secondary">
                    <tr>
                      {["Incentive", "For", "Summary"].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="type-body-sm">
                    {incentives.map((i) => (
                      <tr key={i.category} className="border-t border-default">
                        <th scope="row" className="px-3 py-3 type-label text-primary">
                          {i.category}
                        </th>
                        <td className="px-3 py-3 text-primary">{i.for ?? "—"}</td>
                        <td className={cx("px-3 py-3", i.summary ? "text-primary" : "text-secondary")}>
                          {i.summary ?? "Not specified"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {data.projects.length ? (
            <Card title={`Projects in ${data.name}`} sub="From the India Hydrogen Tracker.">
              <ul className="flex flex-col gap-3">
                {data.projects.map((pr) => (
                  <li key={pr.id} className={cx(linkRow, "sm:flex-row sm:items-center sm:justify-between sm:gap-3")}>
                    <div className="flex flex-col gap-0.5">
                      <Link href={`/tracker/projects/${pr.slug}`} className="type-label text-link hover:underline">
                        {pr.name}
                      </Link>
                      <p className="type-caption text-secondary">
                        {[
                          pr.company,
                          pr.capacityTpa ? `${pr.capacityTpa.toLocaleString("en-IN")} t/yr` : null,
                          pr.technology,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <StatusBadge status={pr.stage} tone={pr.stage === "Commissioned" ? "success" : "progress"} />
                  </li>
                ))}
              </ul>
              <Link href={`/tracker?state=${state}`} className="type-label text-primary hover:underline">
                {data.projectCount === 1 ? "The project in the tracker" : `All ${String(data.projectCount)} projects`}
              </Link>
            </Card>
          ) : null}

          {local.length ? (
            <Card title={`Companies in ${data.name}`} sub="Headquartered or operating here.">
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {local.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-card border border-default p-3">
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary"
                    >
                      {c.initials}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link href={c.href} className="type-label text-link hover:underline">
                        {c.name}
                      </Link>
                      <p className="type-caption text-secondary">{[c.types[0], c.city].filter(Boolean).join(" · ")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:w-96 lg:shrink-0">
          {p?.nodalAgency?.name ? (
            <Card title="Nodal agency" sub="Official contact for the state policy.">
              <p className="type-label text-primary">{p.nodalAgency.name}</p>
              {p.nodalAgency.url ? (
                <a
                  href={p.nodalAgency.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx(buttonClasses({ variant: "outline", size: "sm" }), "self-start")}
                >
                  <Icon name="external-link" size={16} />
                  Official website<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </Card>
          ) : null}
          {data.hubs.length ? (
            <Card title="Hubs and valleys">
              <ul className="flex flex-col gap-3">
                {data.hubs.map((h) => (
                  <li key={h.id} className={linkRow}>
                    <Link href={`/states/hubs?h=${h.slug}`} className="type-label text-link hover:underline">
                      {h.name}
                    </Link>
                    <p className="type-caption text-secondary">
                      {[h.lead, h.focus ?? h.description].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {data.tenders.length || openSchemes.length ? (
            <Card title="Open tenders and schemes">
              <ul className="flex flex-col gap-3">
                {data.tenders.map((t) => (
                  <li key={`t-${String(t.id)}`} className={linkRow}>
                    <Link href={`/opportunities/tenders/${t.slug}`} className="type-label text-link hover:underline">
                      {t.title}
                    </Link>
                    <p className="type-caption text-secondary">Tender · bids due {dayMonthYear(t.bidDueAt)}</p>
                  </li>
                ))}
                {openSchemes.map((s) => {
                  const st = schemeStatus({ nextDeadline: s.nextDeadline, override: s.statusOverride }, now);
                  return (
                    <li key={`s-${String(s.id)}`} className={linkRow}>
                      <Link href={`/opportunities/schemes/${s.slug}`} className="type-label text-link hover:underline">
                        {s.name}
                      </Link>
                      <p className="type-caption text-secondary">
                        Scheme · {s.nextDeadline ? `closes ${dayMonthYear(s.nextDeadline)}` : (s.deadlineNote ?? st)}
                        <span className="sr-only"> ({st})</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
          {news.items.length ? (
            <Card title="News">
              <ul className="flex flex-col gap-3">
                {news.items.map((a) => (
                  <li key={a.id} className={linkRow}>
                    <Link href={a.href} className="type-label text-link hover:underline">
                      {a.title}
                    </Link>
                    <p className="type-caption text-secondary">
                      {a.typeLabel} · {dayMonthYear(a.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
