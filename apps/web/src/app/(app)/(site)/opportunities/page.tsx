import { ArrowLink, buttonClasses, cx, SchemeCard, TenderCard } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { STATE_OPTIONS } from "@/cms/records/states";
import { allGrants, allJobs, allTenders } from "@/opportunities/data";
import { QuerySelect } from "@/opportunities/filters";
import { DaysBadge, JobCards, LoadError, memberHref, wrap } from "@/opportunities/parts";
import {
  daysLeft,
  daysUntil,
  dayMonth,
  DEFAULT_TENDER_STATUSES,
  grantView,
  jobView,
  resultRow,
  sortJobs,
  tenderRow,
  type ResultRow,
} from "@/opportunities/views";
import { allSchemes, schemeView } from "@/schemes/data";
import { siteViewer } from "@/server/site";

// Opportunities home (453:9, step 5.5): what's closing this week across tenders, schemes and calls, then a rail of
// each, then recent results. "Show opportunities for" narrows everything to a state (pan-India and central items
// stay). Alerts arrive with member accounts in step 7.3 (A71).

export const metadata: Metadata = {
  title: "Hydrogen opportunities in India · H2 Economy",
  description: "Tenders, schemes, grants and jobs, checked against the official source.",
  alternates: { canonical: "/opportunities" },
};
export const dynamic = "force-dynamic";

const WEEK = 7;
const FORTNIGHT = 14;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

function Rail({
  id,
  title,
  link,
  children,
}: {
  id: string;
  title: string;
  link: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cx(wrap, "flex flex-col gap-4 pt-12")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id={id} className="type-h2 text-primary">
          {title}
        </h2>
        <ArrowLink asChild>
          <Link href={link.href}>{link.label}</Link>
        </ArrowLink>
      </div>
      {children}
    </section>
  );
}

const TYPE_CHIP =
  "inline-flex h-7 items-center rounded-pill border-[1.5px] border-control px-2.5 type-label-sm text-primary";

export default async function OpportunitiesHome({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const state = STATE_OPTIONS.some((o) => o.value === one(params.state) && o.value !== "all-india")
    ? one(params.state)
    : "";
  const wide = one(params.window) === "14";
  const viewer = await siteViewer();
  const signedIn = Boolean(viewer);
  let data;
  try {
    data = await Promise.all([allTenders(), allSchemes(), allGrants(), allJobs()]);
  } catch (error) {
    console.error("[opportunities] home failed", error);
    return (
      <main id="main" className={cx(wrap, "py-10")}>
        <LoadError what="opportunities" retry="/opportunities" />
      </main>
    );
  }
  const [tenders, schemes, grants, jobs] = data;
  const now = new Date();
  const inState = (states: string[]) => !state || states.length === 0 || states.includes(state);

  const tenderRows = tenders.map((t) => tenderRow(t, now)).filter((t) => inState(t.states));
  const openTenders = tenderRows.filter((t) => DEFAULT_TENDER_STATUSES.includes(t.status.label));
  const schemeViews = schemes.map((s) => schemeView(s, now)).filter((s) => s.central || inState(s.states));
  const openSchemes = schemeViews.filter((s) => s.status.label === "Open" || s.status.label === "Closing soon");
  const grantViews = grants.map((g) => grantView(g, now)).filter((g) => inState(g.states));
  const openGrants = grantViews.filter((g) => g.statusKey === "Open" || g.statusKey === "Closing soon");
  const jobViews = sortJobs(
    jobs.map((j) => jobView(j, now)).filter((j) => j.status === "Live" && inState(j.states)),
    "",
  );
  const results = tenders
    .filter((t) => t.result?.declaredAt && new Date(t.result.declaredAt) <= now)
    .map(resultRow)
    .filter((r): r is ResultRow => r !== null)
    .sort((a, b) => b.declaredAt.localeCompare(a.declaredAt))
    .slice(0, 4);

  const closing = [
    ...openTenders.map((t) => ({ type: "Tender", title: t.title, href: t.href, issuer: t.issuer, at: t.bidDueAt })),
    ...openSchemes
      .filter((s) => s.deadlineAt)
      .map((s) => ({
        type: "Scheme",
        title: s.title,
        href: s.href,
        issuer: s.agencies[0] ?? "",
        at: s.deadlineAt ?? "",
      })),
    ...openGrants.map((g) => ({ type: "Call", title: g.title, href: g.href, issuer: g.funder, at: g.deadlineAt })),
  ]
    .filter((x) => new Date(x.at) > now && daysUntil(x.at, now) <= FORTNIGHT)
    .sort((a, b) => a.at.localeCompare(b.at));
  const thisWeek = closing.filter((x) => daysUntil(x.at, now) <= WEEK);
  const shown = wide ? closing : thisWeek;
  const href = (path: string) => (state ? `${path}?state=${state}` : path);

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between")}>
          <div className="flex flex-col gap-3">
            <h1 className="type-h1 text-primary">Hydrogen opportunities in India</h1>
            <p className="type-body text-body">
              Tenders, schemes, grants and jobs, checked against the official source.
            </p>
            <dl className="flex flex-wrap gap-x-10 gap-y-3 pt-2">
              {[
                { value: openTenders.length, label: "open tenders" },
                { value: openSchemes.length + openGrants.length, label: "schemes and calls open" },
                { value: jobViews.length, label: "jobs" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col-reverse">
                  <dt className="type-caption text-primary">{f.label}</dt>
                  <dd className="type-h1 text-primary">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="type-label-sm text-secondary">Show opportunities for</span>
            <QuerySelect
              name="state"
              label="Show opportunities for"
              placeholder="All states"
              anchor="main"
              options={STATE_OPTIONS.filter((o) => o.value !== "all-india")}
            />
          </div>
        </div>
      </div>

      <div className={cx(wrap, "flex flex-col gap-6 pt-10 lg:flex-row lg:items-start lg:gap-8")}>
        <section
          id="closing"
          aria-labelledby="closing-title"
          className="flex min-w-0 flex-1 scroll-mt-24 flex-col gap-3"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="closing-title" className="type-h2 text-primary">
              {wide ? "Closing in the next 14 days" : "Closing this week"}
            </h2>
            <p className="type-caption text-secondary">Sorted by deadline</p>
          </div>
          {shown.length ? (
            <div className="relative overflow-x-auto rounded-card border border-default">
              <table className="w-full min-w-150 text-left">
                <thead className="bg-subtle type-label-sm text-secondary">
                  <tr>
                    {["Type", "Opportunity", "Issuer", "Deadline"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Days left</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="type-body-sm text-primary">
                  {shown.map((x) => (
                    <tr key={x.href} className="border-t border-default">
                      <td className="px-4 py-3">
                        <span className={TYPE_CHIP}>{x.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={x.href} className="type-label text-primary hover:underline">
                          {x.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{x.issuer}</td>
                      <td className="px-4 py-3 type-spec whitespace-nowrap">{dayMonth(x.at)}</td>
                      <td className="px-4 py-3">
                        <DaysBadge left={{ label: daysLeft(x.at, now), tone: "warning" }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-card bg-subtle p-5 type-body-sm text-body">
              Nothing closes {wide ? "in the next 14 days" : "this week"}
              {state ? " here" : ""}. The rails below list everything open.
            </p>
          )}
          {!wide && closing.length > thisWeek.length ? (
            <ArrowLink asChild className="type-label-sm">
              <Link
                href={`/opportunities?${new URLSearchParams({ ...(state ? { state } : {}), window: "14" }).toString()}#closing`}
              >
                All {closing.length} closing in the next 14 days
              </Link>
            </ArrowLink>
          ) : null}
        </section>
        <aside className="flex flex-col gap-4 lg:w-90 lg:shrink-0">
          <section aria-labelledby="checker" className="flex flex-col gap-3 rounded-card bg-mint p-5">
            <h2 id="checker" className="type-h4 text-primary">
              Check which schemes fit you
            </h2>
            <p className="type-body-sm text-body">
              Answer 6 short questions about your company, state and project. We’ll list the schemes and calls that may
              fit, and what to check next.
            </p>
            <Link href="/opportunities/eligibility" className={cx(buttonClasses({ variant: "primary" }), "self-start")}>
              Start the checker
            </Link>
            <p className="type-caption text-secondary">
              Takes about 2 minutes. Indicative only, not legal or financial advice.
            </p>
          </section>
          <section
            aria-labelledby="alert"
            className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
          >
            <h2 id="alert" className="type-h4 text-primary">
              Create an alert
            </h2>
            <p className="type-body-sm text-body">
              Get new tenders, schemes and jobs that match you by email or WhatsApp.
            </p>
            <ul className="flex flex-wrap gap-2">
              {["Tenders", "Schemes", "Grants", "Jobs"].map((t) => (
                <li key={t}>
                  <Link href={memberHref(signedIn, `/member/alerts?type=${t.toLowerCase()}`)} className={TYPE_CHIP}>
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={memberHref(signedIn, "/member/alerts")}
              className={cx(buttonClasses({ variant: "outline", size: "sm" }), "self-start")}
            >
              Create alert
            </Link>
          </section>
        </aside>
      </div>

      {openTenders.length ? (
        <Rail
          id="tenders"
          title="Tenders"
          link={{ label: `See all ${String(openTenders.length)} tenders`, href: href("/opportunities/tenders") }}
        >
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {openTenders.slice(0, 4).map((t) => (
              <li key={t.id}>
                <TenderCard {...t.card} />
              </li>
            ))}
          </ul>
        </Rail>
      ) : null}

      {openSchemes.length ? (
        <Rail id="schemes" title="Schemes" link={{ label: "See all schemes", href: href("/opportunities/schemes") }}>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {openSchemes.slice(0, 4).map((s) => (
              <li key={s.id}>
                <SchemeCard {...s} />
              </li>
            ))}
          </ul>
        </Rail>
      ) : null}

      {grantViews.some((g) => g.statusKey !== "Closed" && g.statusKey !== "Next round expected") ? (
        <Rail
          id="grants"
          title="Grants & calls"
          link={{ label: "See all grants and calls", href: "/opportunities/grants" }}
        >
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {grantViews
              .filter((g) => g.statusKey !== "Closed" && g.statusKey !== "Next round expected")
              .slice(0, 4)
              .map((g) => (
                <li key={g.id}>
                  <SchemeCard
                    level={g.level}
                    status={g.status}
                    title={g.title}
                    benefit={g.benefit}
                    who={g.who}
                    deadline={g.deadline}
                    verified={g.verified}
                    href={g.href}
                  />
                </li>
              ))}
          </ul>
        </Rail>
      ) : null}

      {jobViews.length ? (
        <Rail
          id="jobs"
          title="Jobs"
          link={{ label: `See all ${String(jobViews.length)} jobs`, href: "/opportunities/jobs" }}
        >
          <JobCards items={jobViews.slice(0, 4)} columns={4} />
        </Rail>
      ) : null}

      {results.length ? (
        <Rail
          id="results"
          title="Recent results & awards"
          link={{ label: "All results", href: "/opportunities/tenders/results" }}
        >
          <ul className="flex flex-col rounded-card border border-default">
            {results.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-1 items-center gap-2 border-b border-default px-4 py-3 last:border-b-0 md:grid-cols-[7rem_1fr_6rem_1fr_8rem_7rem] md:gap-4"
              >
                <span className="type-spec text-primary">{r.date}</span>
                <span className="flex flex-col">
                  <span className="type-label-sm text-secondary">{r.eyebrow.toUpperCase()}</span>
                  <Link href={r.href} className="type-label text-primary hover:underline">
                    {r.title}
                  </Link>
                </span>
                <span className="type-body-sm text-body">{r.bidders}</span>
                <span className="flex flex-col">
                  <span className="type-label text-link">
                    {r.winnersLine ?? r.winners.map((w) => w.name).join(", ")}
                  </span>
                  <span className="type-caption text-secondary">{r.capacity}</span>
                </span>
                <span className="type-spec text-primary">{r.price}</span>
                <Link href={r.meansHref} className="type-label-sm text-link hover:underline">
                  What it means →<span className="sr-only"> for {r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Rail>
      ) : null}
      <div className="pb-16" />
    </main>
  );
}
