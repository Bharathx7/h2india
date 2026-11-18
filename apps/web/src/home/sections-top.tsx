import { FeatureCard, Icon, LogoMarquee, QuoteJourney, StatFigure, Steps3D, type IconName } from "@h2india/ui";
import Link from "next/link";
import { loadBrands, loadFigures, settle, type HomeModule } from "./data";
import { HeroSearch } from "./HeroSearch";
import { container, HomeArrowLink, ModuleError, Section } from "./parts";

// Home sections 01 to 05 (377:4917; logged in 379:4688; phones 381:5845).

type Fail = Set<HomeModule>;

/** 01 Hero (783:7522): wording as drawn (A42). The quote card shows from 1024 px; phones have no card (381:5864).
 * Founder upgrade, 18 Nov 2026: the hero is the dark ink band with the deep green glow the page's other dark bands
 * already use. Founder v2, 18 Nov 2026: the card is the 3D Quote journey, and from 1024 px the hero fills exactly the
 * first screen under the header (162 px), with its content centred, so a laptop never cuts it off and a large monitor
 * never shows white under it. Short laptop screens (under 860 px tall) step the heading down to h1 and tighten gaps. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-inverse">
      <div
        aria-hidden="true"
        className="depth-deep-glow absolute -top-60 -right-40 -z-10 size-150 lg:-top-80 lg:right-[-8%] lg:size-225"
      />
      <div aria-hidden="true" className="depth-deep-glow absolute -bottom-90 -left-60 -z-10 size-160" />
      <div
        aria-hidden="true"
        className="depth-dot-grid absolute top-16 right-0 -z-10 size-100 opacity-40 lg:top-20 lg:left-[52%] lg:size-140"
      />
      <div
        className={`${container} relative flex items-center gap-12 pt-10 pb-12 lg:min-h-[calc(100svh-10.125rem)] lg:py-12 xl:gap-20`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-5 md:gap-7 short:lg:gap-5">
          <h1 id="hero-title" className="hero-reveal type-h1 text-inverse lg:type-display short:lg:type-h1">
            India&rsquo;s hydrogen ecosystem, in one place
          </h1>
          <p className="hero-reveal max-w-140 type-body text-neutral-0/80 [animation-delay:60ms] md:type-body-lg">
            Find hydrogen products and verified suppliers, follow Indian hydrogen news, and act on schemes and tenders.
          </p>
          <HeroSearch />
        </div>
        <div className="hero-reveal hidden w-[46%] shrink-0 justify-end py-6 [animation-delay:200ms] lg:flex xl:w-140">
          <QuoteJourney ctaHref="/rfq/new" />
        </div>
      </div>
    </section>
  );
}

const CHECKS = ["GSTIN", "PAN", "CIN", "Bank name match", "Site visit", "Certificates (PESO, BIS)"];

/** 02 Trust strip (379:4415): brands listed on H2 Economy and what "Verified" means. */
export async function TrustStrip({ fail }: { fail: Fail }) {
  const brands = await settle("brands", fail, loadBrands);
  return (
    <Section id="trust" className="bg-page" inner="flex flex-col gap-6 py-8 md:items-center md:py-14">
      <h2 id="trust-title" className="text-center type-label-sm text-secondary">
        Brands listed on H2 Economy
      </h2>
      {!brands.ok ? (
        <ModuleError title="We couldn't load the brands" text="This is on our side. Try again in a moment." />
      ) : brands.data.length ? (
        <LogoMarquee brands={brands.data} label="Brands listed on H2 Economy" className="w-full" />
      ) : null}
      <div className="flex w-full flex-col gap-3 rounded-card border border-fresh-200 bg-mint px-4 py-4 shadow-soft md:px-6 xl:flex-row xl:items-center xl:gap-6">
        <div className="flex flex-col gap-0.5">
          <p className="type-label text-primary">What &ldquo;Verified&rdquo; means on H2 Economy</p>
          <p className="hidden type-caption text-secondary xl:block">Badges are never sold.</p>
        </div>
        {/* Phones: an even two-column grid, every check the same width and height (founder upgrade, 18 Nov 2026;
            the wrapped pills were uneven), three across on tablets and small laptops. From 1280 px, the original single row of pills
            (founder v2: keep it one line on desktop). */}
        <ul
          className="grid flex-1 auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap"
          aria-label="What we check"
        >
          {CHECKS.map((c) => (
            <li
              key={c}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-fresh-200 bg-page px-2.5 py-1.5 type-label text-primary xl:h-8 xl:min-h-0 xl:gap-0 xl:rounded-pill xl:border-[1.5px] xl:border-control xl:px-2.75 xl:py-0"
            >
              <Icon name="check" size={14} className="shrink-0 text-icon-success xl:hidden" />
              <span className="min-w-0">{c}</span>
            </li>
          ))}
        </ul>
        <p className="type-caption text-secondary xl:hidden">Badges are never sold.</p>
        <HomeArrowLink href="/verification" className="self-start xl:self-auto">
          How we verify
        </HomeArrowLink>
      </div>
    </Section>
  );
}

/** Live stats · loading (381:13047). */
export function FiguresSkeleton() {
  return (
    <section aria-label="India's hydrogen sector, live" aria-busy="true" className="bg-page">
      <div className={`${container} flex flex-col items-center gap-12 py-12 md:py-24`}>
        <span className="block h-11 w-full max-w-115 rounded-control shimmer" />
        <div className="grid w-full grid-cols-2 gap-8 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} aria-hidden="true" className="flex flex-col items-center gap-3">
              <span className="block h-11 w-30 rounded-control shimmer" />
              <span className="block h-4 w-full max-w-42.5 rounded-[6px] shimmer" />
              <span className="block h-3 w-30 rounded-[6px] shimmer" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 03 Live ecosystem (377:5066): figures with their source and date (A45). */
export async function LiveFigures({ fail }: { fail: Fail }) {
  const figures = await settle("figures", fail, () => loadFigures());
  return (
    <Section
      id="live"
      className="bg-linear-to-b from-neutral-0 to-fresh-50"
      inner="flex flex-col items-center gap-10 py-12 md:gap-14 md:py-20"
    >
      <div aria-hidden="true" className="depth-accent-glow absolute -top-55 left-1/2 size-130 -translate-x-1/2" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <h2 id="live-title" className="type-h2 text-primary md:type-h1">
          India&rsquo;s hydrogen sector, live
        </h2>
        <p className="hidden type-body-lg text-body md:block">Every figure shows its date and source.</p>
        <HomeArrowLink href="/tracker">Open the tracker</HomeArrowLink>
      </div>
      {!figures.ok ? (
        <ModuleError
          title="We couldn't load the latest figures"
          text="This is on our side. Try again, or open the tracker."
        />
      ) : (
        <div
          data-testid="live-figures"
          className="relative grid w-full grid-cols-2 gap-x-4 gap-y-7 md:flex md:items-start md:gap-6"
        >
          {figures.data.map((f, i) => (
            <div key={f.label} className="contents">
              {i > 0 ? <span aria-hidden="true" className="hidden h-24 w-px shrink-0 bg-ink-200 md:block" /> : null}
              <div
                className={
                  "md:flex-1 " +
                  (figures.data.length % 2 === 1 && i === figures.data.length - 1 ? "col-span-2 mx-auto max-w-43" : "")
                }
              >
                <StatFigure value={f.value} label={f.label} source={f.source} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

const PATHS: { eyebrow: string; title: string; text: string; link: string; href: string; icon: IconName }[] = [
  {
    eyebrow: "I want to buy",
    title: "Source hydrogen equipment with confidence",
    text: "Compare specs, send one request to up to 5 verified suppliers and pay only after delivery.",
    link: "Request quotes",
    href: "/rfq/new",
    icon: "package",
  },
  {
    eyebrow: "I want to sell",
    title: "Reach India's hydrogen buyers",
    text: "List your company free, add your products and answer requests for quotes.",
    link: "List your company",
    href: "/list-your-company",
    icon: "truck",
  },
  {
    eyebrow: "I want to stay informed",
    title: "Follow Indian hydrogen, every week",
    text: "News, scheme deadlines and tenders, with alerts that fit your work.",
    link: "Get the newsletter",
    href: "/newsletter",
    icon: "file-text",
  },
  {
    eyebrow: "I'm researching or studying",
    title: "Learn and find funding",
    text: "Hydrogen 101, the glossary, grants and calls, jobs and internships.",
    link: "Start Hydrogen 101",
    href: "/knowledge/hydrogen-101",
    icon: "clipboard-check",
  },
];

/** 04 Choose your path (779:7142), for visitors. */
export function ChoosePath() {
  return (
    <Section id="paths" className="bg-page" inner="flex flex-col gap-5 py-12 md:gap-10 md:py-24">
      <div className="flex flex-col items-center gap-2 md:items-start">
        <h2 id="paths-title" className="type-h2 text-primary">
          Choose your path
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {PATHS.map((p) => (
          <FeatureCard
            key={p.eyebrow}
            eyebrow={p.eyebrow}
            title={p.title}
            href={p.href}
            icon={p.icon}
            linkLabel={p.link}
            className="lg:min-h-90"
          >
            {p.text}
          </FeatureCard>
        ))}
      </div>
    </Section>
  );
}

/**
 * 04 For you (780:8387), for signed-in people. Alerts, saved items, course progress and follows come with Stages 6
 * and 7, so each card shows its empty state until then (A43).
 */
export function ForYou({ firstName, workspaceHref }: { firstName: string; workspaceHref: string }) {
  const cards = [
    {
      eyebrow: "Your alerts",
      title: "No alerts yet",
      text: "Set an alert and we'll tell you when a tender or scheme matches.",
      href: "/opportunities/tenders",
    },
    {
      eyebrow: "Saved",
      title: "Nothing saved yet",
      text: "Save products, schemes and tenders to find them here.",
      href: workspaceHref,
    },
    {
      eyebrow: "Hydrogen 101",
      title: "Start with the basics",
      text: "How hydrogen is made, stored, moved and used, in short chapters.",
      href: "/knowledge/hydrogen-101",
    },
    {
      eyebrow: "Following",
      title: "Follow companies and topics",
      text: "Updates from what you follow will show here.",
      href: "/directory/companies",
    },
  ];
  return (
    <Section id="for-you" className="bg-mint" inner="flex flex-col gap-5 py-12 md:gap-10 md:py-24">
      <h2 id="for-you-title" className="text-center type-h2 text-primary" data-testid="for-you-title">
        {firstName ? `For you, ${firstName}` : "For you"}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <FeatureCard key={c.eyebrow} eyebrow={c.eyebrow} title={c.title} href={c.href} className="shadow-none">
            {c.text}
          </FeatureCard>
        ))}
      </div>
    </Section>
  );
}

const STEPS = [
  { title: "Describe what you need", text: "Specs, quantity, delivery site and the date you need it on site." },
  { title: "H2 Economy checks it", text: "We review every request within 1 working day before it goes out." },
  { title: "Compare and choose", text: "Quotes arrive in one format. Accept the best one and order." },
  {
    title: "Confirm, then pay",
    text: "The supplier confirms first. You pay into escrow with our payment partner; it's released after you accept delivery.",
  },
];

/** 05 How it works (RFQ band 389:8561). */
export function HowItWorks() {
  return (
    <Section id="how" className="bg-inverse" inner="flex flex-col gap-10 py-12 md:gap-14 md:py-30">
      <div aria-hidden="true" className="depth-deep-glow absolute -top-90 left-[62.5%] size-150" />
      <div aria-hidden="true" className="depth-deep-glow absolute top-75 -left-50 size-225" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-172.5 flex-col gap-4">
          <p className="type-label-sm text-fresh-300">Request a quote</p>
          <h2 id="how-title" className="type-h2 text-inverse">
            Send one request to up to 5 verified suppliers
          </h2>
          <p className="type-body text-neutral-0/80">
            H2 Economy checks every request within 1 working day. Suppliers then quote in the same format, so you can
            compare them side by side.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <Link
            href="/rfq/new"
            className="inline-flex h-12 items-center justify-center rounded-pill bg-accent px-5.75 type-label-lg text-primary hover:shadow-soft"
          >
            Request a quote
          </Link>
          <Link
            href="/for-buyers#payments"
            className="inline-flex h-12 items-center justify-center rounded-pill bg-page px-5.75 type-label-lg text-primary hover:bg-mint"
          >
            How payments are protected
          </Link>
        </div>
      </div>
      <Steps3D steps={STEPS} tone="dark" label="How a request for quotes works" className="relative" />
    </Section>
  );
}
