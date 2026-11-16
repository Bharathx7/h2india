import type { Metadata } from "next";
import Link from "next/link";
import { cx, Icon, type IconName } from "@h2india/ui";
import { audienceFaqs } from "@/trust/data";
import { Block, card, DarkCta, Faqs, Feature, Hero, main, Steps } from "@/trust/parts";

// For Buyers (93:906). Category product counts are live counts from the catalogue (Stage 6); until there are real
// listings the cards show no count. Questions come from the CMS (For Buyers and Suppliers questions).

export const metadata: Metadata = {
  title: "For buyers · H2 Economy",
  description:
    "Find verified Indian suppliers, compare like-for-like quotes and order with a GST invoice. Free for buyers.",
  alternates: { canonical: "/for-buyers" },
};
export const dynamic = "force-dynamic";

const CATEGORIES: { label: string; icon: IconName }[] = [
  { label: "Electrolysers", icon: "zap" },
  { label: "Fuel cells", icon: "activity" },
  { label: "Compressors", icon: "arrow-up-down" },
  { label: "Storage and cylinders", icon: "package" },
  { label: "Refuelling equipment", icon: "truck" },
  { label: "Balance of plant", icon: "sliders" },
  { label: "Testing and safety", icon: "clipboard-check" },
  { label: "Engineering services", icon: "users" },
];

export default async function ForBuyersPage() {
  const faqs = await audienceFaqs();
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="For buyers"
        title="Source hydrogen equipment with confidence"
        lead="Find verified Indian suppliers, compare like-for-like quotes and order with a GST invoice. Free for buyers."
        actions={[
          { label: "Request a quote", href: "/rfq/new", primary: true },
          { label: "Browse the marketplace", href: "/marketplace" },
        ]}
      />
      <Block id="how" title="How it works" lead="From first search to GST invoice in four steps.">
        <Steps
          steps={[
            {
              title: "Discover",
              text: "Search products and verified suppliers, or browse categories and buyer's guides.",
            },
            { title: "Compare", text: "Put up to five products side by side, with specs in the same units." },
            {
              title: "Request quotes",
              text: "Send one request to up to five suppliers. Quotes come back in the same format.",
            },
            {
              title: "Order with a GST invoice",
              text: "Accept a quote and place the order. Every order ends in a GST invoice.",
            },
          ]}
        />
      </Block>
      <Block id="why" title="Why buy on H2 Economy">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon="shield-check"
            title="Verified suppliers"
            text="Each badge lists the checks we made and the date we made them."
          />
          <Feature
            icon="table"
            title="Comparable quotes"
            text="Every supplier answers the same fields: price, lead time, delivery and payment terms."
          />
          <Feature
            icon="lock"
            title="Payment held until you accept"
            text="When orders launch, we hold your payment until you accept the delivery."
          />
          <Feature
            icon="users"
            title="Company accounts with approvals"
            text="Add colleagues and approve orders before they go out."
          />
        </div>
      </Block>
      <Block
        id="categories"
        title="Categories you can source"
        lead="Equipment, components and services for every stage of a hydrogen project."
      >
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <li key={c.label}>
              <Link
                href={`/search?q=${encodeURIComponent(c.label)}`}
                className={cx(card, "flex items-center justify-between gap-3 p-4 hover:border-focus")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-control bg-mint text-icon-primary">
                    <Icon name={c.icon} size={18} />
                  </span>
                  <span className="type-label text-primary">{c.label}</span>
                </span>
                <Icon name="arrow-right" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </Block>
      <Faqs id="questions" title="Questions buyers ask" items={faqs.buyers ?? []} />
      <DarkCta
        eyebrow="For buyers"
        title="Create a free buyer account"
        text="Save suppliers, track quote requests and add colleagues. It takes about two minutes."
        actions={[
          { label: "Create a buyer account", href: "/join/buyer" },
          { label: "Buyer sign in", href: "/buyer/sign-in", primary: false },
        ]}
      />
    </main>
  );
}
