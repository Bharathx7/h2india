import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CONSENT_TEXT } from "@/cms/knowledge/gate";
import { allReports, getReport } from "@/knowledge/data";
import { ReportCover, reportPages } from "@/knowledge/parts";
import { ReportFlow } from "@/knowledge/ReportGate";
import { WeeklyBox } from "@/news/client";
import { dayMonthYear } from "@/news/format";
import { Crumbs, wrap } from "@/opportunities/parts";
import { siteViewer } from "@/server/site";
import { cx } from "@h2india/ui";

// A report (gated landing 736:421 and 745:7422, "Your report is ready" 736:833; step 5.6). The form asks only for
// what the design shows; the lead and the consent words with their version are kept (A33, DPDP).

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await getReport((await params).slug);
  if (!r) return { title: "Not found · H2 India" };
  return {
    title: `${r.title} · Reports · H2 India`,
    description: r.summary,
    alternates: { canonical: `/knowledge/reports/${r.slug}` },
  };
}
export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [r, reports, viewer] = await Promise.all([getReport(slug), allReports(), siteViewer()]);
  if (!r) notFound();
  const pages = reportPages(r);
  const sponsor = r.sponsor?.name?.trim() || null;
  const meta = [
    `${r.kicker ?? "Report"} report`,
    dayMonthYear(r.publishedOn),
    pages ? `${String(pages)} pages` : null,
    "PDF",
  ]
    .filter(Boolean)
    .join(" · ");
  const others = reports
    .filter((x) => x.id !== r.id)
    .slice(0, 2)
    .map((x) => {
      const p = reportPages(x);
      return {
        slug: x.slug,
        title: x.title,
        meta: [dayMonthYear(x.publishedOn), p ? `${String(p)} pages` : null, x.gated ? null : "free"]
          .filter(Boolean)
          .join(" · "),
      };
    });

  const header = (
    <div className="flex flex-col gap-1">
      <h1 className="type-h1 text-primary">{r.title}</h1>
      <p className="type-body text-body">{meta}</p>
    </div>
  );
  const landing = (
    <>
      {sponsor && r.sponsor?.disclosure ? (
        <div className="flex items-start gap-3 rounded-card bg-subtle p-4">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-page px-2.5 py-1 type-label-sm text-body">
            <span aria-hidden="true" className="size-1.5 rounded-pill bg-ink-500" />
            Sponsored
          </span>
          <p className="type-body-sm text-body">{r.sponsor.disclosure}</p>
        </div>
      ) : null}
      <section aria-labelledby="summary" className="flex flex-col gap-2 rounded-card border border-default p-5">
        <h2 id="summary" className="type-h4 text-primary">
          Summary
        </h2>
        <p className="type-body text-body">{r.summary}</p>
      </section>
      {(r.findings ?? []).length ? (
        <section aria-labelledby="findings" className="flex flex-col gap-3 rounded-card border border-default p-5">
          <h2 id="findings" className="type-h4 text-primary">
            Key findings
          </h2>
          <ol className="flex flex-col">
            {(r.findings ?? []).map((f, i) => (
              <li
                key={f.id ?? f.finding}
                className="flex items-center gap-3 border-t border-default py-2.5 type-body-sm text-body"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
                  {i + 1}
                </span>
                {f.finding}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {(r.contents ?? []).length ? (
        <section aria-labelledby="contents" className="flex flex-col gap-3 rounded-card border border-default p-5">
          <h2 id="contents" className="type-h4 text-primary">
            Contents
          </h2>
          <ol className="flex flex-col">
            {(r.contents ?? []).map((c, i, list) => (
              <li key={c.id ?? c.chapter} className="flex gap-4 border-t border-default py-2 type-body-sm text-body">
                <span className="w-5 type-spec text-secondary">
                  {i === list.length - 1 && /method/i.test(c.chapter) ? "–" : i + 1}
                </span>
                {c.chapter}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {r.writtenBy ? (
        <section aria-labelledby="written" className="flex flex-col gap-2 rounded-card border border-default p-5">
          <h2 id="written" className="type-h4 text-primary">
            Written by
          </h2>
          <p className="type-body-sm text-body">{r.writtenBy}</p>
        </section>
      ) : null}
    </>
  );

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Knowledge", href: "/knowledge" },
            { label: "Reports", href: "/knowledge/reports" },
            { label: r.title.split(":")[0] ?? r.title },
          ]}
        />
      </div>
      <div className={cx(wrap, "pb-16 pt-4")}>
        <ReportFlow
          slug={r.slug}
          gated={Boolean(r.gated)}
          sponsor={sponsor}
          consentText={sponsor ? CONSENT_TEXT(sponsor) : null}
          member={Boolean(viewer)}
          cover={<ReportCover report={r} />}
          smallCover={<ReportCover report={r} size="sm" />}
          header={header}
          landing={landing}
          title={r.subtitle ? `${r.title.split(":")[0] ?? r.title}: ${r.subtitle}` : r.title}
          meta={["PDF", pages ? `${String(pages)} pages` : null].filter(Boolean).join(" · ")}
          others={others}
          newsletter={<WeeklyBox tone="tint" />}
        />
      </div>
    </main>
  );
}
