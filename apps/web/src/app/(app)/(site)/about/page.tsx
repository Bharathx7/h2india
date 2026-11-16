import type { Metadata } from "next";
import Link from "next/link";
import { cx, Icon } from "@h2india/ui";
import { NewsBand } from "@/news/client";
import { trustDetails } from "@/trust/data";
import { Block, card, Feature, FigureTile, Hero, main, Value, wrap } from "@/trust/parts";
import { istDay } from "@/trust/views";

// About H2 Economy (66:4251). The Why now figures are entered with their source and date (Company and legal details,
// A45); the disclosure names the operating company (M2) and shows [placeholders] until it's entered.

export const metadata: Metadata = {
  title: "About H2 Economy",
  description:
    "H2 Economy brings India's hydrogen products, companies, news, schemes, tenders, knowledge and events into one place.",
  alternates: { canonical: "/about" },
};
export const dynamic = "force-dynamic";

const PARTS = [
  {
    icon: "shopping-cart",
    title: "Marketplace",
    text: "Products and services in five classes, with spec filters, compare, quote requests and orders for fixed-price items.",
  },
  {
    icon: "building",
    title: "Directory",
    text: "Indian and global companies active in India, plus experts and institutions, with a map.",
  },
  {
    icon: "newspaper",
    title: "News and Insights",
    text: "Daily India-first hydrogen news, analysis, interviews and the H2 Economy Weekly newsletter.",
  },
  {
    icon: "file-text",
    title: "Opportunities",
    text: "Central and state schemes, SIGHT rounds, tenders, grants and jobs, with alerts.",
  },
  {
    icon: "bar-chart",
    title: "Knowledge and data",
    text: "Hydrogen 101, buyer's guides, a glossary, the standards library and the India Hydrogen Tracker.",
  },
  {
    icon: "calendar",
    title: "Events and community",
    text: "Summits, expos, webinars and training, and profiles for students and researchers.",
  },
] as const;

export default async function AboutPage() {
  const t = await trustDetails();
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="About H2 Economy"
        title="Build India’s hydrogen ecosystem"
        lead="H2 Economy brings India's hydrogen products, companies, news, schemes, tenders, knowledge and events into one place, so the people building the industry can find each other and decide with facts."
      />
      <Block
        id="why-now"
        title="Why now"
        lead="The National Green Hydrogen Mission has moved from targets to awards. Commissioning is just starting, and buyers, suppliers and policymakers need one shared picture."
      >
        {t.aboutFigures.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.aboutFigures.map((f) => (
              <FigureTile key={f.label} f={f} large />
            ))}
          </div>
        ) : null}
      </Block>
      <Block id="what-we-do" title="What we do" lead="Six parts of one platform.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PARTS.map((p) => (
            <Feature key={p.title} icon={p.icon} title={p.title} text={p.text} />
          ))}
        </div>
      </Block>
      <div className={cx(wrap, "grid grid-cols-1 gap-4 pt-12 md:grid-cols-2 md:pt-16")}>
        <section aria-labelledby="independence" className="flex flex-col gap-2 rounded-card bg-mint p-6">
          <p className="type-eyebrow text-link">Editorial independence</p>
          <h2 id="independence" className="type-h4 text-primary">
            Our newsroom decides what to cover
          </h2>
          <p className="type-body-sm text-body">
            Advertisers and sponsors never see stories before they&apos;re published and can&apos;t change them.
            Sponsored content is always labelled, and no payment buys a badge or a better place in search.
          </p>
          <Link href="/legal/editorial-policy" className="inline-flex items-center gap-1 type-label-sm text-link">
            Read our editorial policy <Icon name="arrow-right" size={14} />
          </Link>
        </section>
        <section aria-labelledby="disclosure" className={cx(card, "flex flex-col gap-2 p-6")}>
          <p className="type-eyebrow text-secondary">Disclosure</p>
          <h2 id="disclosure" className="type-h4 text-primary">
            Who runs H2 Economy
          </h2>
          <p className="type-body-sm text-body">
            H2 Economy is operated by <Value>{t.operatingCompany}</Value>.
            {t.disclosure ? (
              <>
                {" "}
                {t.disclosureDate ? `As of ${istDay(t.disclosureDate)}, ` : ""}
                {t.disclosure}
              </>
            ) : null}
          </p>
        </section>
      </div>
      <nav aria-label="The people behind H2 Economy" className={cx(wrap, "flex flex-wrap items-center gap-4 pt-8")}>
        <span className="type-body-sm text-body">The people behind H2 Economy:</span>
        {[
          ["Team and advisors", "/about/team"],
          ["Careers", "/careers"],
          ["Contact us", "/contact"],
        ].map(([label, href]) => (
          <Link key={href} href={href ?? "/"} className="inline-flex items-center gap-1 type-label-sm text-link">
            {label} <Icon name="arrow-right" size={14} />
          </Link>
        ))}
      </nav>
      <div className="pt-16">
        <NewsBand />
      </div>
    </main>
  );
}
