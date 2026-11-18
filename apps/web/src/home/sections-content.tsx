import { ArticleCard, Button, EmptyState, EventCard, FeatureCard, SchemeCard, TenderCard } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  loadEvents,
  loadHubs,
  loadNews,
  loadSchemes,
  loadSight,
  loadTenders,
  settle,
  type HomeModule,
  type Sight,
} from "./data";
import { container, HomeArrowLink, ModuleError, Section, SectionTitle } from "./parts";

// Home sections 09 to 13 (377:4917; phones 381:5845; module error and empty 381:13116).

type Fail = Set<HomeModule>;

function Column({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <h3 className="type-h4 text-primary">{title}</h3>
        {count ? (
          <span
            className="rounded-pill bg-subtle px-2 py-0.5 type-label-sm text-primary"
            aria-label={`${String(count)} shown`}
          >
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** Opportunities · loading (381:13066). */
export function OpportunitiesSkeleton() {
  return (
    <section aria-label="Opportunities this week" aria-busy="true" className="bg-page">
      <div className={`${container} flex flex-col gap-6 py-12 md:py-24`}>
        <span className="block h-8.5 w-80 max-w-full rounded-control shimmer" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[0, 1].map((c) => (
            <div key={c} className="flex flex-col gap-4">
              {[0, 1, 2].map((r) => (
                <span key={r} className="block h-10.75 rounded-card shimmer" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * 09 Opportunities this week (378:3648): the two tenders closing soonest and two open schemes. Each column loads on
 * its own; a failed column shows the designed error, an empty one its empty state (381:13116). The columns stretch to
 * one height and their cards share it, so the four cards line up.
 */
/** Two tenders and two schemes (founder upgrade, 18 Nov 2026): four cards, the columns the same height. */
const OPPORTUNITIES_EACH = 2;

export async function Opportunities({ fail, signedIn }: { fail: Fail; signedIn: boolean }) {
  const now = new Date();
  const [tenders, schemes] = await Promise.all([
    settle("tenders", fail, () => loadTenders(now, OPPORTUNITIES_EACH)),
    settle("schemes", fail, () => loadSchemes(now, OPPORTUNITIES_EACH)),
  ]);
  const gate = (href: string) => (signedIn ? href : `/sign-in?next=${encodeURIComponent(href)}`);
  return (
    <Section id="opportunities" className="bg-page" inner="flex flex-col gap-5 py-12 md:gap-8 md:py-20">
      <SectionTitle
        id="opportunities"
        title="Opportunities this week"
        sub="Deadlines and status are checked against the official source."
        link={{ label: "See all opportunities", href: "/opportunities" }}
        className="[&>a]:max-md:hidden"
      />
      <div className="flex flex-col gap-5 md:flex-row md:items-stretch md:gap-6">
        <Column title="Tenders closing soon">
          <div data-testid="tenders-module" className="flex flex-1 flex-col gap-4 md:[&>article]:flex-1">
            {!tenders.ok ? (
              <ModuleError
                title="We couldn't load this week's tenders"
                text="This is on our side. Try again, or open the full tenders list."
              />
            ) : tenders.data.length === 0 ? (
              <EmptyState
                kind="no-results"
                title="No tenders close this week"
                action={
                  <Button asChild size="md">
                    <Link href={gate("/opportunities/tenders#alerts")}>Set an alert</Link>
                  </Button>
                }
              >
                Set an alert and we&rsquo;ll tell you when a tender that fits you opens.
              </EmptyState>
            ) : (
              tenders.data.map((t) => <TenderCard key={t.href} {...t} trackHref={gate(t.trackHref)} />)
            )}
          </div>
        </Column>
        <Column title="Schemes and calls open">
          <div data-testid="schemes-module" className="flex flex-1 flex-col gap-4 md:[&>article]:flex-1">
            {!schemes.ok ? (
              <ModuleError
                title="We couldn't load the open schemes"
                text="This is on our side. Try again, or open the full schemes list."
              />
            ) : schemes.data.length === 0 ? (
              <EmptyState
                kind="no-results"
                title="No schemes close this week"
                action={
                  <Button asChild size="md">
                    <Link href={gate("/opportunities/schemes#alerts")}>Set an alert</Link>
                  </Button>
                }
              >
                Set an alert and we&rsquo;ll tell you when a scheme that fits you opens.
              </EmptyState>
            ) : (
              schemes.data.map((s) => (
                <SchemeCard key={s.href} {...s} saveHref={gate(`${s.href}#save`)} alertHref={gate(`${s.href}#alert`)} />
              ))
            )}
          </div>
        </Column>
      </div>
      <Button asChild variant="outline" size="lg" className="w-full md:hidden">
        <Link href="/opportunities">See all opportunities</Link>
      </Button>
    </Section>
  );
}

/** Latest news · loading (381:13101). */
export function NewsSkeleton() {
  return (
    <section aria-label="Insights and news" aria-busy="true" className="bg-mint">
      <div className={`${container} flex flex-col gap-6 py-12 md:py-24`}>
        <span className="block h-8.5 w-94 max-w-full rounded-control shimmer" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-57 rounded-card shimmer" />
          ))}
        </div>
      </div>
    </section>
  );
}

function SightChart({ chart }: { chart: Sight["charts"][number] }) {
  const max = Math.max(...chart.bars.map((b) => b.value), 1);
  return (
    <figure className="flex min-w-0 flex-1 flex-col gap-3.5">
      <figcaption className="type-label text-primary">{chart.title}</figcaption>
      {chart.bars.map((b) => (
        <div key={b.label} className="flex flex-col gap-1.5">
          <p className="type-caption text-secondary">{b.label}</p>
          <div className="flex items-center gap-2.5">
            <span className="h-4 rounded-[4px] bg-accent" style={{ width: `${String((b.value / max) * 67)}%` }} />
            <span className="type-spec text-primary" data-numeric="">
              {b.shown}
            </span>
          </div>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-default pt-2.5">
        <span className="type-label text-primary">Total</span>
        <span className="type-spec text-link" data-numeric="">
          {chart.total}
        </span>
      </div>
    </figure>
  );
}

const WORDS = ["One", "Two", "Three", "Four"];

/** 10 Insights and news (378:3886): lead story, explainer of the week, more news and the SIGHT snapshot (A45). */
export async function Insights({ fail }: { fail: Fail }) {
  const [news, sight] = await Promise.all([settle("news", fail, loadNews), settle("sight", fail, loadSight)]);
  const counts = sight.ok && sight.data ? sight.data.charts.map((c) => c.bars.length) : [];
  const sameCount = counts.length === 2 && counts[0] === counts[1] ? WORDS[(counts[0] ?? 1) - 1] : null;
  return (
    <Section id="insights" className="bg-mint" inner="flex flex-col gap-5 py-12 md:gap-10 md:py-24">
      <SectionTitle id="insights" title="Latest Indian hydrogen news" link={{ label: "All news", href: "/news" }} />
      <div data-testid="news-module">
        {!news.ok ? (
          <ModuleError
            title="We couldn't load the latest news"
            text="This is on our side. Try again, or open the newsroom."
          />
        ) : !news.data.lead ? (
          <EmptyState kind="first-use" icon="newspaper" title="News is on its way">
            The newsroom opens with our first stories.
          </EmptyState>
        ) : (
          <>
            <div className="hidden gap-6 lg:flex">
              <div className="flex w-172.5 shrink-0 flex-col gap-6">
                <ArticleCard layout="lead" {...news.data.lead} />
                {news.data.explainer ? (
                  <div className="flex flex-col gap-2 rounded-card border border-fresh-200 bg-page p-4">
                    <ArticleCard layout="compact" {...news.data.explainer} section="Policy explainer of the week" />
                    <HomeArrowLink href={news.data.explainer.href} className="self-start">
                      Read the explainer
                    </HomeArrowLink>
                  </div>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {news.data.more.map((a) => (
                  <ArticleCard key={a.href} layout="compact" {...a} />
                ))}
              </div>
            </div>
            <ul
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:hidden"
              aria-label="Latest news"
            >
              {[news.data.lead, ...(news.data.explainer ? [news.data.explainer] : []), ...news.data.more].map((a) => (
                <li key={a.href} className="w-72 shrink-0 snap-start">
                  <ArticleCard layout="standard" {...a} className="h-full" />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div data-testid="sight-module">
        {!sight.ok ? (
          <ModuleError
            title="We couldn't load the tracker snapshot"
            text="This is on our side. Try again, or open the tracker."
          />
        ) : sight.data ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-6 rounded-modal border border-fresh-200 bg-page p-5 shadow-soft md:p-8 lg:flex-row lg:gap-12">
              <div className="flex flex-col gap-2.5 lg:w-96 lg:shrink-0">
                <p className="type-eyebrow text-secondary">From the India Hydrogen Tracker</p>
                <h3 className="type-h4 text-primary">What SIGHT has awarded so far</h3>
                <p className="type-body text-body">
                  {sameCount
                    ? `${sameCount} ${sameCount === "One" ? "tranche" : "tranches"} each for green hydrogen production and electrolyser manufacturing.`
                    : "Awards for green hydrogen production and electrolyser manufacturing, by tranche."}
                </p>
                <HomeArrowLink href="/tracker/sight" className="self-start">
                  Open the tracker
                </HomeArrowLink>
              </div>
              <div className="flex flex-1 flex-col gap-6 md:flex-row md:gap-12">
                {sight.data.charts.map((c) => (
                  <SightChart key={c.title} chart={c} />
                ))}
              </div>
            </div>
            {sight.data.source ? <p className="type-caption text-secondary">{sight.data.source}</p> : null}
          </div>
        ) : null}
      </div>
    </Section>
  );
}

const TARGETS = [
  { value: "5 MMT", label: "green hydrogen production capacity a year" },
  { value: "~125 GW", label: "renewable energy capacity added" },
  { value: "₹8 lakh crore+", label: "investment expected" },
  { value: "~50 MMT", label: "CO₂ emissions avoided each year" },
];

/** 11 Why it matters (854:8): the National Green Hydrogen Mission 2030 targets as drawn, with their source (A42). */
export function WhyItMatters() {
  return (
    <Section
      id="mission"
      className="bg-inverse"
      inner="flex flex-col gap-4 py-16 lg:flex-row lg:items-center lg:gap-12 lg:py-30"
    >
      <div
        aria-hidden="true"
        className="depth-deep-glow absolute -top-60 -left-50 size-140 lg:-top-95 lg:-left-65 lg:size-225"
      />
      <div aria-hidden="true" className="depth-accent-glow absolute top-65 left-[72%] hidden size-160 lg:block" />
      <div
        aria-hidden="true"
        className="depth-dot-grid absolute -top-15 left-[68%] hidden size-120 opacity-40 lg:block"
      />
      <div className="relative flex flex-col gap-4 lg:w-121.5 lg:shrink-0">
        <p className="type-eyebrow text-fresh-300">National Green Hydrogen Mission · 2030 targets</p>
        <h2 id="mission-title" className="type-h2 text-inverse md:type-h1">
          India is building a 5 MMT green hydrogen economy
        </h2>
        <p className="type-body text-neutral-0/80 md:type-body-lg">
          H2 Economy connects the buyers, suppliers, schemes and tenders that get it built.
        </p>
        <Link
          href="/opportunities/schemes?mission=nghm"
          className="hidden items-center gap-1.5 self-start type-label text-fresh-300 hover:underline lg:inline-flex"
        >
          Explore schemes under the mission <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="relative flex flex-1 flex-col gap-3">
        <dl className="flex flex-col gap-4 lg:gap-3">
          {TARGETS.map((t) => (
            <div
              key={t.value}
              data-reveal-item=""
              className="flex flex-col gap-1 rounded-card border border-neutral-0/12 bg-neutral-0/6 px-5 py-4 backdrop-blur-glass-16 lg:flex-row lg:items-center lg:gap-6 lg:px-7 lg:py-5"
            >
              <dt className="sr-only">{t.label}</dt>
              <dd className="type-h1 text-fresh-500 lg:w-110 lg:shrink-0 lg:type-display">{t.value}</dd>
              <dd className="type-body text-neutral-0/80 lg:type-body-lg" aria-hidden="true">
                {t.label}
              </dd>
            </div>
          ))}
        </dl>
        <p className="type-caption text-neutral-0/64">
          2030 targets of the National Green Hydrogen Mission, MNRE, approved January 2023.
        </p>
        <Link
          href="/opportunities/schemes?mission=nghm"
          className="inline-flex h-11 items-center gap-1.5 self-start type-label text-fresh-300 hover:underline lg:hidden"
        >
          Explore schemes under the mission <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Section>
  );
}

const KNOWLEDGE = [
  {
    eyebrow: "Hydrogen 101",
    title: "Start with the basics",
    text: "How hydrogen is made, stored, moved and used, in short chapters.",
    href: "/knowledge/hydrogen-101",
  },
  {
    eyebrow: "Buyer's guides",
    title: "Specify and buy with confidence",
    text: "Technologies compared, key specs explained and questions to ask suppliers.",
    href: "/knowledge/guides",
  },
  {
    eyebrow: "Glossary",
    title: "Every term, in plain language",
    text: "Units, standards and acronyms, linked to products and articles.",
    href: "/knowledge/glossary",
  },
];

/** 12 Events and learning (379:4236): upcoming events, the tracker teaser and Knowledge for everyone. */
export async function EventsLearning({ fail }: { fail: Fail }) {
  const [events, hubs] = await Promise.all([
    settle("events", fail, () => loadEvents()),
    settle("hubs", fail, loadHubs),
  ]);
  return (
    <Section id="events" className="bg-mint" inner="flex flex-col gap-5 py-12 md:gap-10 md:py-24">
      <SectionTitle id="events" title="Upcoming events" link={{ label: "All events", href: "/events" }} />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1" data-testid="events-module">
          {!events.ok ? (
            <ModuleError
              title="We couldn't load upcoming events"
              text="This is on our side. Try again, or open the events list."
            />
          ) : events.data.length === 0 ? (
            <EmptyState kind="first-use" icon="calendar" title="No events coming up">
              New webinars, summits and trainings show here as they are announced.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {events.data.map((e, i) => (
                <div key={e.href} className={i > 1 ? "max-md:hidden" : undefined}>
                  <EventCard {...e} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          className="flex flex-col gap-4 rounded-card border border-default bg-page p-6 lg:w-120 lg:shrink-0"
          data-testid="hubs-module"
        >
          <p className="type-eyebrow text-secondary">India Hydrogen Tracker</p>
          <h3 className="type-h4 text-primary">Where India&rsquo;s hydrogen is being built</h3>
          {!hubs.ok ? (
            <ModuleError title="We couldn't load the map" text="This is on our side. Try again, or open the tracker." />
          ) : hubs.data ? (
            <>
              <div
                className="relative h-65 overflow-hidden rounded-control bg-mint"
                role="img"
                aria-label={hubs.data.legend}
              >
                {hubs.data.pins.map((p) => (
                  <span
                    key={p.name}
                    className="absolute flex items-center gap-1"
                    style={{ left: `${String(p.x)}%`, top: `${String(p.y)}%` }}
                  >
                    <span className="size-3 rounded-pill border-2 border-page bg-accent" />
                    <span className="rounded-pill bg-page px-2 py-0.5 type-label-sm whitespace-nowrap text-primary">
                      {p.name}
                    </span>
                  </span>
                ))}
              </div>
              <p className="type-caption text-secondary">{hubs.data.legend}</p>
            </>
          ) : (
            <p className="type-body-sm text-body">Hubs show here once the tracker lists them.</p>
          )}
          <HomeArrowLink href="/tracker" className="self-start">
            Open the tracker
          </HomeArrowLink>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-5 md:mt-0 md:gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="type-h2 text-primary">Knowledge for everyone</h2>
          <HomeArrowLink href="/knowledge" className="self-start md:self-auto">
            Knowledge home
          </HomeArrowLink>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {KNOWLEDGE.map((k) => (
            <FeatureCard key={k.eyebrow} eyebrow={k.eyebrow} title={k.title} href={k.href} className="lg:min-h-52.5">
              {k.text}
            </FeatureCard>
          ))}
        </div>
      </div>
    </Section>
  );
}

/** 13 Final CTA (Final CTA panel 846:11189). */
export function FinalCta() {
  return (
    <Section id="final" className="bg-page" inner="py-12 md:py-24">
      <h2 id="final-title" className="sr-only">
        Get started
      </h2>
      <div className="relative flex flex-col gap-8 overflow-hidden rounded-modal bg-linear-[166deg] from-fresh-200 from-15% to-fresh-50 to-85% p-6 shadow-soft md:flex-row md:gap-12 md:p-14">
        <div aria-hidden="true" className="depth-accent-glow absolute -top-70 left-[71.6%] size-140" />
        <div aria-hidden="true" className="depth-dot-grid absolute -top-75 left-[83%] size-120" />
        {[
          {
            eyebrow: "For buyers",
            title: "Buying hydrogen equipment?",
            text: "Send one request to up to 5 verified suppliers and pay only after the supplier confirms.",
            action: (
              <Button asChild size="lg">
                <Link href="/rfq/new">Request a quote</Link>
              </Button>
            ),
          },
          {
            eyebrow: "For suppliers",
            title: "Selling to India's hydrogen projects?",
            text: "List your company free, add your products and answer requests for quotes.",
            action: (
              <Button asChild size="lg" variant="outline">
                <Link href="/list-your-company">List your company</Link>
              </Button>
            ),
          },
        ].map((c, i) => (
          <div key={c.eyebrow} className="contents">
            {i === 1 ? (
              <span aria-hidden="true" className="relative h-px w-full bg-fresh-300 md:h-auto md:w-px" />
            ) : null}
            <div className="relative flex flex-1 flex-col items-start gap-3">
              <p className="type-eyebrow text-link">{c.eyebrow}</p>
              <h3 className="type-h2 text-primary">{c.title}</h3>
              <p className="type-body-lg text-body">{c.text}</p>
              <span className="h-2" />
              {c.action}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
