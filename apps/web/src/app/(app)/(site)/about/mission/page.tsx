import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, cx, Icon } from "@h2india/ui";
import { card, main, PageHead, wrap } from "@/trust/parts";

// Mission (741:6475): words as drawn.

export const metadata: Metadata = {
  title: "Mission · H2 India",
  description:
    "Our mission is to help India build its hydrogen economy faster, by making it easy to find the right product, partner, scheme and fact.",
  alternates: { canonical: "/about/mission" },
};

const VALUES = [
  {
    title: "Independent newsroom",
    text: "Our editors decide what we cover. Sponsors never see or change a story before it's published.",
  },
  {
    title: "Verified, never sold",
    text: "Badges are earned through checks, not bought. No payment improves a company's place in search.",
  },
  { title: "Sourced and dated", text: "Every fact has a source and a date, and we correct mistakes in the open." },
  {
    title: "Useful to everyone",
    text: "Students, start-ups and PSUs get the same facts. Most of H2 India is free.",
  },
  {
    title: "Built for India",
    text: "Indian units, rules, approvals, languages and payment methods come first.",
  },
  {
    title: "Open about ourselves",
    text: "We say who runs H2 India and what we sell, and we'll tell you if that changes.",
  },
];

export default function MissionPage() {
  return (
    <main id="main" className={main}>
      <PageHead
        crumbs={[{ label: "Company", href: "/about" }, { label: "Mission" }]}
        title="Why India’s hydrogen economy needs a home"
        lead="The National Green Hydrogen Mission has moved from targets to awards. Buyers, suppliers, researchers and policymakers need one shared, trustworthy picture."
      />
      <div className={cx(wrap, "pt-6")}>
        <p className="rounded-card bg-mint p-6 type-h4 text-primary md:p-8">
          Our mission is to help India build its hydrogen economy faster, by making it easy to find the right product,
          partner, scheme and fact.
        </p>
      </div>
      <section aria-labelledby="values" className={cx(wrap, "flex flex-col gap-4 pt-10")}>
        <h2 id="values" className="type-h3 text-primary">
          What we hold ourselves to
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => (
            <li key={v.title} className={cx(card, "flex flex-col gap-2 p-5")}>
              <Icon name="shield-check" size={20} className="text-icon-primary" />
              <h3 className="type-h4 text-primary">{v.title}</h3>
              <p className="type-body-sm text-body">{v.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <div className={cx(wrap, "grid gap-4 pt-6 md:grid-cols-2")}>
        {[
          {
            title: "The team",
            text: "Meet the people who run H2 India and answer for every verification decision.",
            label: "Team and advisors",
            href: "/about/team",
          },
          {
            title: "Work with us",
            text: "We're hiring reporters, analysts and supplier success managers.",
            label: "See open roles",
            href: "/careers",
          },
        ].map((b) => (
          <section
            key={b.title}
            aria-label={b.title}
            className="flex flex-col gap-3 rounded-card bg-subtle p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <h2 className="type-h4 text-primary">{b.title}</h2>
              <p className="type-body-sm text-body">{b.text}</p>
            </div>
            <Link href={b.href} className={cx(buttonClasses({ variant: "outline", size: "sm" }), "shrink-0 bg-page")}>
              {b.label}
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}
