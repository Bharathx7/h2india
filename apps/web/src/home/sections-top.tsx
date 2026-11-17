import { FeatureCard, HeroNetwork, LogoMarquee, StatFigure, type IconName } from "@h2india/ui";
import Link from "next/link";
import { loadBrands, loadFigures, settle, type HomeModule } from "./data";
import { HeroSearch } from "./HeroSearch";
import { container, HomeArrowLink, ModuleError, Section } from "./parts";

// Home sections 01 to 05 (377:4917; logged in 379:4688; phones 381:5845).

type Fail = Set<HomeModule>;

/** 01 Hero (783:7522): wording as drawn (A42). The network card shows from 1024 px; phones have no card (381:5864). */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-mint">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-30 bg-linear-to-b from-fresh-50 to-neutral-0 lg:h-40"
      />
      <div
        aria-hidden="true"
        className="depth-accent-glow absolute -top-65 left-20 size-130 lg:-top-74 lg:left-[66.6%] lg:size-180"
      />
      <div aria-hidden="true" className="depth-dot-grid absolute top-30 left-[59.7%] hidden size-120 lg:block" />
      <div className={`${container} relative flex items-center gap-12 py-8 lg:py-16`}>
        <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6">
          <h1 id="hero-title" className="hero-reveal type-h1 text-primary lg:type-display">
            India&rsquo;s hydrogen ecosystem, in one place
          </h1>
          <p className="hero-reveal type-body text-body [animation-delay:60ms] md:type-body-lg">
            Find hydrogen products and verified suppliers, follow Indian hydrogen news, and act on schemes and tenders.
          </p>
          <HeroSearch />
        </div>
        <HeroNetwork className="hidden w-[46%] shrink-0 lg:block xl:w-150" />
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
      <h2 id="trust-title" className="text-center type-eyebrow text-secondary">
        Brands listed on H2 Economy
      </h2>
      {!brands.ok ? (
        <ModuleError title="We couldn't load the brands" text="This is on our side. Try again in a moment." />
      ) : brands.data.length ? (
        <LogoMarquee brands={brands.data} label="Brands listed on H2 Economy" className="w-full" />
      ) : null}
      <div className="flex w-full flex-col gap-3 rounded-card border border-fresh-200 bg-mint px-4 py-4 shadow-soft md:flex-row md:items-center md:gap-6 md:px-6">
        <div className="flex flex-col gap-0.5">
          <p className="type-label text-primary">What &ldquo;Verified&rdquo; means on H2 Economy</p>
          <p className="hidden type-caption text-secondary md:block">Badges are never sold.</p>
        </div>
        <ul className="flex flex-1 flex-wrap gap-2" aria-label="What we check">
          {CHECKS.map((c) => (
            <li
              key={c}
              className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control bg-page px-2.75 type-label text-primary"
            >
              {c}
            </li>
          ))}
        </ul>
        <p className="type-caption text-secondary md:hidden">Badges are never sold.</p>
        <HomeArrowLink href="/verification" className="self-start md:self-auto">
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
    <Section id="paths" className="bg-mint" inner="flex flex-col gap-5 py-12 md:gap-10 md:py-24">
      <div className="flex flex-col items-center gap-2 md:items-start">
        <p className="type-eyebrow text-secondary">Start here</p>
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
          <p className="type-eyebrow text-fresh-300">Request a quote</p>
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
      <ol className="relative grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            data-reveal-item=""
            className="flex flex-col gap-2.5 rounded-card border border-neutral-0/12 bg-neutral-0/6 p-6 backdrop-blur-glass-16"
          >
            <div className="flex items-center gap-2.5">
              <span className="rounded-pill bg-accent px-2.5 py-1 type-spec text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span aria-hidden="true" className="h-0.5 flex-1 bg-fresh-500/40" />
            </div>
            <h3 className="type-label-lg text-inverse">{s.title}</h3>
            <p className="type-body-sm text-neutral-0/80">{s.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
