import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, cx, Icon, type IconName } from "@h2india/ui";
import { audienceFaqs, pricing } from "@/trust/data";
import { Block, card, DarkCta, Faqs, Feature, Hero, main, Steps, wrap } from "@/trust/parts";

// For Suppliers (93:1331). The launch-offer band shows only when the offer is entered on Pricing (C1 is parked);
// questions come from the CMS.

export const metadata: Metadata = {
  title: "For suppliers · H2 India",
  description:
    "Get a verified listing, receive structured quote requests from engineering and procurement teams, and reach India's hydrogen buyers.",
  alternates: { canonical: "/for-suppliers" },
};
export const dynamic = "force-dynamic";

const BUYERS: { label: string; icon: IconName }[] = [
  { label: "PSUs and oil companies", icon: "building" },
  { label: "Refineries and fertiliser plants", icon: "zap" },
  { label: "EPC contractors", icon: "clipboard-check" },
  { label: "Project developers", icon: "map-pin" },
  { label: "Mobility pilots", icon: "truck" },
];

export default async function ForSuppliersPage() {
  const [faqs, p] = await Promise.all([audienceFaqs(), pricing()]);
  const offer = p?.commission?.launchValue && p.commission.launchNote ? p.commission : null;
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="For suppliers"
        title="Reach India’s hydrogen buyers"
        lead="Get a verified listing, receive structured quote requests from engineering and procurement teams, and get paid through H2 India with a GST invoice when orders launch."
        actions={[
          { label: "List your company", href: "/list-your-company", primary: true },
          { label: "See pricing", href: "/pricing" },
        ]}
      />
      <Block id="buying" title="Who’s buying" lead="Buyers on H2 India work at organisations like these.">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BUYERS.map((b) => (
            <li key={b.label} className={cx(card, "flex items-center gap-2.5 p-4 type-label text-primary")}>
              <Icon name={b.icon} size={18} className="shrink-0 text-icon-primary" />
              {b.label}
            </li>
          ))}
        </ul>
      </Block>
      <Block id="steps" title="Live in 4 steps" lead="Most suppliers are live within a week.">
        <Steps
          steps={[
            {
              title: "Company and GSTIN",
              text: "Add your legal name, GSTIN and PAN. We check the GSTIN on the GST portal straight away.",
            },
            {
              title: "Products or datasheets",
              text: "Add products one by one, or upload datasheets and we draft the listings for you to check.",
            },
            {
              title: "Review",
              text: "We check your documents within 2 working days. You can keep adding products meanwhile.",
            },
            {
              title: "Live",
              text: "Your storefront goes live with a dated Verified badge. Start answering quote requests.",
            },
          ]}
        />
      </Block>
      <Block id="get" title="What you get">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon="building"
            title="Storefront"
            text="A company profile with products, certificates, projects and news in one place."
          />
          <Feature
            icon="inbox"
            title="Quote request inbox"
            text="Structured requests with a reply-by date. Your response time shows on your profile."
          />
          <Feature
            icon="bar-chart"
            title="Analytics"
            text="Profile views, product views, quote requests and win rate, by category and month."
          />
          <Feature
            icon="shield-check"
            title="Verification badge"
            text="Your badge lists each check and the date we made it, so buyers trust you before they write."
          />
          <Feature
            icon="upload"
            title="Datasheet to listing"
            text="Upload a datasheet PDF and we draft the listing with specs and units for you to approve."
          />
          <Feature
            icon="newspaper"
            title="News and event submissions"
            text="Submit press releases, events and jobs to reach the people who read H2 India."
          />
        </div>
      </Block>
      {offer ? (
        <div className={cx(wrap, "pt-12")}>
          <section
            aria-labelledby="offer"
            className="flex flex-col gap-3 rounded-card bg-mint p-6 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex flex-col gap-1">
              <p className="type-eyebrow text-link">Launch offer</p>
              <h2 id="offer" className="type-h3 text-primary">
                {offer.launchValue === "₹0" ? "Zero commission" : `${offer.launchValue} commission`} {offer.launchNote}
              </h2>
              <p className="type-body-sm text-body">
                Listing is free. After the offer, a commission applies only to orders paid through H2 India, capped per
                order.
              </p>
              <p className="type-caption text-secondary">
                GST TCS and income-tax TDS still apply to payouts, as the law requires.
              </p>
            </div>
            <Link href="/pricing" className={cx(buttonClasses({ variant: "outline", size: "sm" }), "shrink-0 bg-page")}>
              See pricing
            </Link>
          </section>
        </div>
      ) : null}
      <Faqs id="questions" title="Questions suppliers ask" items={faqs.suppliers ?? []} />
      <DarkCta
        eyebrow="For suppliers"
        title="Ready to sell?"
        text="Register your company in about 10 minutes. Keep your GST certificate handy."
        actions={[{ label: "List your company", href: "/list-your-company" }]}
      />
    </main>
  );
}
