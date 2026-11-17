import { Alert, ArrowLink, Breadcrumbs, cx, EmptyState, StatusBadge, TenderCard } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { dayMonthYear } from "@/news/format";
import { StoryCard, wrap } from "@/news/parts";
import { listArticles } from "@/news/data";
import { sightSchemes, sightTracker, tendersForSchemes, tenderView, toneOf } from "@/schemes/data";

// SIGHT programme tracker (418:2079; phones 420:2439, step 5.4): headline figures, every round, the awardees, open and
// upcoming rounds (tenders linked to the SIGHT schemes) and SIGHT news. Figures come from SECI and MNRE documents and
// carry their source. Alerts for the next round come with step 7.3.

export const metadata: Metadata = {
  title: "SIGHT programme tracker · H2 Economy",
  description: "Every SIGHT round SECI has run, who won it, and what's open now.",
  alternates: { canonical: "/opportunities/sight" },
};
export const dynamic = "force-dynamic";

const GROUPS = ["Electrolysers", "Green hydrogen", "Green ammonia"];

export default async function SightPage({ searchParams }: { searchParams: Promise<{ group?: string; all?: string }> }) {
  const params = await searchParams;
  const now = new Date();
  const [tracker, schemes, news] = await Promise.all([
    sightTracker(),
    sightSchemes(),
    listArticles({ tag: "sight", limit: 4 }),
  ]);
  const tenders = await tendersForSchemes(
    schemes.map((s) => s.id),
    3,
  );
  const open = tenders.filter((t) => new Date(t.bidDueAt) > now);
  const component = (needle: string) => schemes.find((s) => s.name.toLowerCase().includes(needle));
  const electrolysers = component("electrolyser");
  const production = component("production");
  const group = GROUPS.includes(params.group ?? "") ? params.group : undefined;
  const awardees = (tracker?.awardees ?? []).filter((a) => !group || a.group === group);
  const shown = params.all === "1" ? awardees : awardees.slice(0, 10);

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-3 py-8 md:py-10")}>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Opportunities", href: "/opportunities" },
              { label: "SIGHT tracker" },
            ]}
            renderLink={(c, className) => (
              <Link href={c.href} className={className}>
                {c.label}
              </Link>
            )}
          />
          <h1 className="mt-2 type-h1 text-primary">SIGHT programme tracker</h1>
          {tracker ? <p className="max-w-180 type-body text-body">{tracker.intro}</p> : null}
          <p className="flex flex-wrap items-center gap-x-6 gap-y-2 type-caption text-secondary">
            {tracker?.verifiedAt ? (
              <span>
                Last verified {dayMonthYear(tracker.verifiedAt)}
                {tracker.sourcesLine ? ` · Sources: ${tracker.sourcesLine}` : ""}
              </span>
            ) : null}
            {electrolysers ? (
              <ArrowLink asChild className="type-label-sm">
                <Link href={`/opportunities/schemes/${electrolysers.slug}`}>
                  Component I: electrolyser manufacturing
                </Link>
              </ArrowLink>
            ) : null}
            {production ? (
              <ArrowLink asChild className="type-label-sm">
                <Link href={`/opportunities/schemes/${production.slug}`}>Component II: production incentive</Link>
              </ArrowLink>
            ) : null}
          </p>
        </div>
      </div>

      {!tracker ? (
        <div className={cx(wrap, "py-12")}>
          <div className="rounded-card border border-default bg-page py-8">
            <EmptyState kind="first-use" icon="bar-chart" title="The SIGHT tracker is being prepared">
              Our editors are entering every round from SECI and MNRE documents.
            </EmptyState>
          </div>
        </div>
      ) : (
        <>
          {(tracker.figures ?? []).length ? (
            <section
              aria-label="Headline figures"
              className={cx(wrap, "grid grid-cols-1 gap-4 pt-10 sm:grid-cols-2 lg:grid-cols-4")}
            >
              {(tracker.figures ?? []).map((f) => (
                <div key={f.id ?? f.label} className="flex flex-col gap-1 rounded-card bg-mint p-5">
                  <p className="type-display text-primary">{f.value}</p>
                  <p className="type-label text-primary">{f.label}</p>
                  <p className="type-caption text-secondary">{f.source}</p>
                </div>
              ))}
            </section>
          ) : null}

          {(tracker.rounds ?? []).length ? (
            <section aria-labelledby="rounds" className={cx(wrap, "flex flex-col gap-4 pt-12")}>
              <div className="flex flex-col gap-1">
                <h2 id="rounds" className="type-h2 text-primary">
                  All rounds
                </h2>
                <p className="type-body-sm text-secondary">Every SIGHT round SECI has run, newest results first</p>
              </div>
              <div className="relative overflow-x-auto rounded-card border border-default">
                <table className="w-full min-w-200 text-left">
                  <thead className="bg-subtle type-label-sm text-secondary">
                    <tr>
                      {[
                        "Component",
                        "Mode",
                        "Tranche",
                        "Product",
                        "Offered",
                        "Awarded",
                        "Bid due",
                        "Result",
                        "Status",
                      ].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="type-body-sm text-primary">
                    {(tracker.rounds ?? []).map((r) => (
                      <tr
                        key={r.id ?? `${r.component}-${r.mode ?? ""}-${r.tranche ?? ""}`}
                        className="border-t border-default"
                      >
                        <td className="px-4 py-3 type-label-sm">{r.component}</td>
                        <td className="px-4 py-3">{r.mode}</td>
                        <td className="px-4 py-3">{r.tranche}</td>
                        <td className="px-4 py-3">{r.product}</td>
                        <td className="px-4 py-3 type-spec">{r.offered}</td>
                        <td className="px-4 py-3 type-spec">{r.awarded}</td>
                        <td className="px-4 py-3">{r.bidDue}</td>
                        <td className="px-4 py-3">{r.result}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} tone={toneOf(r.status)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {(tracker.awardees ?? []).length ? (
            <section aria-labelledby="awardees" className={cx(wrap, "flex flex-col gap-4 pt-12")}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 id="awardees" className="type-h2 text-primary">
                    Awardees
                  </h2>
                  <p className="type-body-sm text-secondary">
                    Companies awarded capacity, linked to their H2 Economy profile where one exists
                  </p>
                </div>
                <nav aria-label="Awardee groups" className="flex flex-wrap gap-2">
                  {[undefined, ...GROUPS].map((g) => (
                    <Link
                      key={g ?? "all"}
                      href={
                        g
                          ? `/opportunities/sight?group=${encodeURIComponent(g)}#awardees`
                          : "/opportunities/sight#awardees"
                      }
                      scroll={false}
                      aria-current={g === group ? "page" : undefined}
                      className={cx(
                        "inline-flex h-8 items-center rounded-pill border-[1.5px] px-2.75 type-label",
                        g === group
                          ? "border-transparent bg-inverse text-inverse"
                          : "border-control bg-page text-primary hover:border-focus",
                      )}
                    >
                      {g ?? "All"}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="relative overflow-x-auto rounded-card border border-default">
                <table className="w-full min-w-170 text-left">
                  <thead className="bg-subtle type-label-sm text-secondary">
                    <tr>
                      {["Company", "Round", "Capacity", "Price or incentive", "Profile"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="type-body-sm text-primary">
                    {shown.map((a) => (
                      <tr key={a.id ?? `${a.company}-${a.round}`} className="border-t border-default">
                        <td className="px-4 py-3 type-label">{a.company}</td>
                        <td className="px-4 py-3">{a.round}</td>
                        <td className="px-4 py-3 type-spec">{a.capacity}</td>
                        <td className="px-4 py-3 type-spec">{a.priceOrIncentive}</td>
                        <td className="px-4 py-3">
                          {a.profileSlug ? (
                            <Link
                              href={`/directory/companies/${a.profileSlug}`}
                              className="type-label-sm text-link hover:underline"
                            >
                              View profile<span className="sr-only"> of {a.company}</span>
                            </Link>
                          ) : (
                            <span className="type-caption text-secondary">Not on H2 Economy</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {awardees.length > shown.length ? (
                <Link
                  href={`/opportunities/sight?${new URLSearchParams({ ...(group ? { group } : {}), all: "1" }).toString()}#awardees`}
                  scroll={false}
                  className="inline-flex h-10 items-center self-start rounded-pill border border-control px-4 type-label text-primary hover:border-focus"
                >
                  Show all awardees
                </Link>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      {open.length ? (
        <section aria-labelledby="open-rounds" className={cx(wrap, "flex flex-col gap-4 pt-12")}>
          <div className="flex flex-col gap-1">
            <h2 id="open-rounds" className="type-h2 text-primary">
              Upcoming and open rounds
            </h2>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {open.map((t) => (
              <li key={t.id}>
                <TenderCard {...tenderView(t, now)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {news.items.length ? (
        <section aria-labelledby="sight-news" className={cx(wrap, "flex flex-col gap-4 pt-12")}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="sight-news" className="type-h2 text-primary">
              Related news
            </h2>
            <ArrowLink asChild>
              <Link href="/tags/sight">All SIGHT news</Link>
            </ArrowLink>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {news.items.map((a) => (
              <li key={a.id}>
                <StoryCard a={a} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={cx(wrap, "py-12")}>
        <Alert tone="info" title="Figures come from public SECI and MNRE documents">
          Awarded capacity can change if a winner withdraws or an award is cancelled. Check the official result before
          relying on a number.
        </Alert>
      </div>
    </main>
  );
}
