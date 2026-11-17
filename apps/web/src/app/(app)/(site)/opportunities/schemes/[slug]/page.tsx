import { Alert, Breadcrumbs, buttonClasses, cx, Icon, StatusBadge, TenderCard } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { schemeStatus } from "@/cms/records/status";
import { getDb } from "@h2india/core";
import { recordAlert } from "@h2india/core/alerts";
import { memberHref } from "@/opportunities/parts";
import { getSession } from "@/server/auth";
import { ShareButton } from "@/news/client";
import { dayMonthYear } from "@/news/format";
import { StoryCard, wrap } from "@/news/parts";
import {
  agencyOf,
  getScheme,
  isCentral,
  newsForTopics,
  stateLabel,
  stateValues,
  tendersForSchemes,
  tenderView,
  toneOf,
} from "@/schemes/data";
import type { Topic } from "@/payload-types";

// Scheme detail (416:1354; phones 417:1794; next round expected 421:4769, step 5.4). Every scheme links to its official
// source and shows when it was last checked; applications happen on the official portal, never here. "Don't miss the
// next round" sets an alert on this scheme (421:5274, step 7.3).

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const s = await getScheme((await params).slug);
  if (!s) return { title: "Not found · H2 Economy" };
  return {
    title: `${s.name} · Schemes · H2 Economy`,
    description: s.summary,
    alternates: { canonical: `/opportunities/schemes/${s.slug}` },
  };
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="type-h2 text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

const host = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "") + new URL(url).pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
};

export default async function SchemePage({ params }: { params: Params }) {
  const { slug } = await params;
  // The home page's SIGHT link (A62): the SIGHT programme has its own tracker page.
  if (slug === "sight") redirect("/opportunities/sight");
  const s = await getScheme(slug);
  if (!s) notFound();
  const now = new Date();
  const status = schemeStatus({ nextDeadline: s.nextDeadline, override: s.statusOverride }, now);
  const topics = (s.topics ?? []).filter((t): t is Topic => typeof t === "object");
  const session = await getSession().catch(() => null);
  const [tenders, news, alert] = await Promise.all([
    tendersForSchemes([s.id], 2),
    newsForTopics(
      topics.map((t) => t.id),
      3,
    ),
    session ? recordAlert(getDb(), session.user.id, "schemes", String(s.id)) : null,
  ]);
  const states = stateValues(s);
  const eyebrow = [
    isCentral(s) ? "Central" : `State · ${states.map(stateLabel).join(", ")}`,
    agencyOf(s),
    ...(s.benefitTypes ?? []),
  ].join(" · ");
  const verified = s.verification?.at ? dayMonthYear(s.verification.at) : null;
  const deadline = s.nextDeadline
    ? `Next deadline ${dayMonthYear(s.nextDeadline)}${s.deadlineNote ? ` · ${s.deadlineNote}` : ""}`
    : (s.deadlineNote ?? null);
  const glance: { label: string; value: ReactNode }[] = [
    { label: "Implementing agency", value: s.runBy },
    ...(s.ministry ? [{ label: "Ministry", value: s.ministry }] : []),
    ...(s.outlay ? [{ label: "Outlay", value: s.outlay }] : []),
    ...((s.benefitTypes ?? []).length ? [{ label: "Benefit type", value: (s.benefitTypes ?? []).join(", ") }] : []),
    ...((s.whoCanApply ?? []).length ? [{ label: "Who can apply", value: (s.whoCanApply ?? []).join(", ") }] : []),
    ...(s.howToApply ? [{ label: "How to apply", value: s.howToApply }] : []),
    {
      label: "Official source",
      value: (
        <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
          {host(s.sourceUrl)} ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ),
    },
    { label: "Last verified", value: verified ? `${verified} by H2 Economy editors` : "Not yet verified" },
  ];
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-3 py-8")}>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Opportunities", href: "/opportunities" },
              { label: "Schemes", href: "/opportunities/schemes" },
              { label: s.name },
            ]}
            renderLink={(c, className) => (
              <Link href={c.href} className={className}>
                {c.label}
              </Link>
            )}
          />
          <p className="type-eyebrow text-secondary">{eyebrow}</p>
          <h1 className="max-w-200 type-h1 text-primary">{s.name}</h1>
          <p className="flex flex-wrap items-center gap-3">
            <StatusBadge status={status} tone={toneOf(status)} />
            {deadline ? (
              <span className="inline-flex items-center gap-1.5 type-label-sm text-primary">
                <Icon name="calendar" size={16} />
                {deadline}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className={cx(wrap, "flex flex-col gap-8 py-8 lg:flex-row lg:items-start lg:gap-12")}>
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-10">
          {status === "Next round expected" ? (
            <Alert tone="info" title="No round is open right now">
              {s.runBy} has not announced dates for the next round.
            </Alert>
          ) : null}
          <section
            aria-labelledby="glance"
            className="flex flex-col gap-4 rounded-card border border-default bg-page p-5"
          >
            <h2 id="glance" className="type-h4 text-primary">
              At a glance
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {glance.map((g) => (
                <div key={g.label} className="flex flex-col gap-0.5">
                  <dt className="type-eyebrow text-secondary">{g.label}</dt>
                  <dd className="type-body-sm text-primary">{g.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {s.purpose ? (
            <Section id="purpose" title="Purpose">
              <p className="type-body text-body">{s.purpose}</p>
            </Section>
          ) : null}

          {(s.tranches ?? []).length ? (
            <Section id="tranches" title="Modes and tranches">
              <div className="relative overflow-x-auto rounded-card border border-default">
                <table className="w-full min-w-150 text-left">
                  <thead className="bg-subtle type-label-sm text-secondary">
                    <tr>
                      {["Mode", "Tranche", "Product", "Capacity (t/yr)", "Status", "Results"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="type-body-sm text-primary">
                    {(s.tranches ?? []).map((t) => (
                      <tr key={t.id ?? `${t.mode}-${t.tranche ?? ""}`} className="border-t border-default">
                        <td className="px-4 py-3 whitespace-nowrap">{t.mode}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{t.tranche}</td>
                        <td className="px-4 py-3">{t.product}</td>
                        <td className="px-4 py-3 type-spec">{t.capacity}</td>
                        <td className="px-4 py-3">
                          {t.state ? <StatusBadge status={t.state} tone={toneOf(t.state)} /> : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {t.resultsUrl ? (
                            <a
                              href={t.resultsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-link hover:underline"
                            >
                              View
                              <span className="sr-only">
                                {" "}
                                results for {t.mode} {t.tranche}
                              </span>
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : null}

          {(s.eligibility ?? []).length ? (
            <Section id="who" title="Who can apply">
              <ul className="flex flex-col gap-3">
                {(s.eligibility ?? []).map((e) => (
                  <li key={e.id ?? e.condition} className="flex items-start gap-2.5 type-body-sm text-body">
                    <Icon name="check-circle" size={18} className="mt-0.5 shrink-0 text-icon-primary" />
                    {e.condition}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {s.benefits || (s.benefitRates ?? []).length ? (
            <Section id="benefits" title="Benefits">
              {s.benefits ? <p className="type-body text-body">{s.benefits}</p> : null}
              {(s.benefitRates ?? []).length ? (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(s.benefitRates ?? []).map((b) => (
                    <li key={b.id ?? b.label} className="flex flex-col gap-1 rounded-card bg-subtle p-4">
                      <span className="type-eyebrow text-secondary">{b.label}</span>
                      <span className="type-h3 text-primary">{b.value}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Section>
          ) : null}

          {(s.timeline ?? []).length ? (
            <Section id="timeline" title="Timeline">
              <ol className="flex flex-col gap-2">
                {(s.timeline ?? []).map((t, i) => (
                  <li key={t.id ?? `${t.when}-${t.what}`} className="flex items-start gap-3 type-body-sm text-body">
                    <span
                      aria-hidden="true"
                      className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-tint type-label-sm text-primary"
                    >
                      {i + 1}
                    </span>
                    <span>
                      <span className="type-label text-primary">{t.when}</span> · {t.what}
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}

          {(s.documentsNeeded ?? []).length ? (
            <Section id="documents" title="Documents you will need">
              <ul className="flex flex-col gap-3">
                {(s.documentsNeeded ?? []).map((d) => (
                  <li key={d.id ?? d.document} className="flex items-start gap-2.5 type-body-sm text-body">
                    <Icon name="file-text" size={18} className="mt-0.5 shrink-0 text-icon-primary" />
                    {d.document}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {(s.faqs ?? []).length ? (
            <Section id="questions" title="Questions">
              <div className="flex flex-col">
                {(s.faqs ?? []).map((f, i) => (
                  <details key={f.id ?? f.question} open={i === 0} className="group border-b border-default py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 type-label text-primary">
                      {f.question}
                      <Icon
                        name="chevron-down"
                        size={18}
                        className="shrink-0 transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <p className="pt-2 type-body-sm text-body">{f.answer}</p>
                  </details>
                ))}
              </div>
            </Section>
          ) : null}

          {tenders.length ? (
            <Section id="tenders" title="Related tenders">
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {tenders.map((t) => (
                  <li key={t.id}>
                    <TenderCard {...tenderView(t, now)} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {news.length ? (
            <Section id="news" title="Related news">
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {news.map((a) => (
                  <li key={a.id}>
                    <StoryCard a={a} className="h-full" />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Alert tone="info" title="Verify at the official source">
            This page summarises public documents from {agencyOf(s)}. It is not legal or financial advice. Rules, dates
            and amounts can change.
          </Alert>
        </div>

        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <div className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4 text-primary">Don't miss the next round</h2>
            <p className="type-body-sm text-secondary">
              You'll also see updates in your workspace under Saved and alerts.
            </p>
            {alert?.active ? (
              <>
                <Alert tone="success" title="Alert set">
                  We'll email you when {s.runBy} issues the next {s.name} round or declares results.
                </Alert>
                <Link href="/member/alerts" className={cx(buttonClasses({ variant: "outline" }), "w-full")}>
                  Manage alerts
                </Link>
              </>
            ) : (
              <Link
                href={memberHref(Boolean(session), `/member/alerts?scheme=${s.slug}`)}
                className={cx(buttonClasses({ variant: "primary" }), "w-full")}
              >
                Set alert for next round
              </Link>
            )}
            <Link href="/opportunities/eligibility" className={cx(buttonClasses({ variant: "outline" }), "w-full")}>
              Check eligibility
            </Link>
            <div className="flex items-center gap-2 type-label-sm text-secondary">
              Share <ShareButton title={s.name} />
            </div>
          </div>
          <section aria-label="Official sources" className="flex flex-col gap-2 rounded-card bg-subtle p-4">
            <p className="type-eyebrow text-secondary">Official sources</p>
            <a
              href={s.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="type-label-sm text-link hover:underline"
            >
              {s.runBy} · official page ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
            {(s.documents ?? []).map((d) => (
              <a
                key={d.id ?? d.url}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="type-label-sm text-link hover:underline"
              >
                {d.title} ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
            {verified ? <p className="type-caption text-secondary">Last verified {verified}</p> : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
