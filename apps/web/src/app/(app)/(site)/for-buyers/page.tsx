import type { Metadata } from "next";
import Link from "next/link";
import { cx, Icon, type IconName } from "@h2india/ui";
import { audienceFaqs } from "@/trust/data";
import { Block, card, DarkCta, Faqs, FeatureGrid, Hero, HeroPreview, Highlights, main, Steps } from "@/trust/parts";

// For Buyers (93:906), on the common audience layout (founder, 20 Nov 2026): hero with a preview of the buyer
// workspace, what buyers can do, why buy here, how it works, categories, questions and sign-up. Only buyer actions
// on this page (founder: no supplier sign-up here). Every line names something the buyer workspace already does.

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

const CAN: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "search",
    title: "Search the marketplace",
    text: "Find products and verified suppliers by category, application and the specs that matter to you.",
  },
  {
    icon: "compare",
    title: "Compare products",
    text: "Put up to five products side by side, with specs in the same units.",
  },
  {
    icon: "file-text",
    title: "Request quotes",
    text: "Send one request to up to five suppliers, with your quantities, delivery site and dates.",
  },
  {
    icon: "table",
    title: "Compare quotes",
    text: "Every quote answers the same fields: price, lead time, delivery and payment terms, side by side.",
  },
  {
    icon: "folder",
    title: "Project lists",
    text: "Save products to a list for each project, then turn the list into a quote request.",
  },
  {
    icon: "message-square",
    title: "Messages",
    text: "Ask suppliers about a quote request in one thread, with the files kept alongside.",
  },
];

const WHY: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "shield-check",
    title: "Verified suppliers",
    text: "Each badge lists the checks we made and the date we made them.",
  },
  {
    icon: "users",
    title: "Your team, your rules",
    text: "Add colleagues with their own roles, and keep every request in your company account.",
  },
  { icon: "check-circle", title: "Free for buyers", text: "You never pay H2 Economy to search, compare or request." },
];

export default async function ForBuyersPage() {
  const faqs = await audienceFaqs();
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="For buyers"
        title="Source hydrogen equipment with confidence"
        lead="Find verified Indian suppliers, compare like-for-like quotes and order with a GST invoice. Free for buyers."
        chips={["Procurement teams", "EPC contractors", "Project developers", "Plant engineers"]}
        actions={[
          { label: "Request a quote", href: "/rfq/new", primary: true },
          { label: "Browse the marketplace", href: "/marketplace" },
        ]}
        aside={
          <HeroPreview
            title="Your buyer workspace"
            badge="Buyer"
            rows={[
              { icon: "file-text", title: "Quote requests", text: "Sent, answered and closing soon" },
              { icon: "table", title: "Quotes side by side", text: "Price, lead time and terms in one view" },
              { icon: "folder", title: "Project lists", text: "Products saved for each project" },
              { icon: "users", title: "Team", text: "Colleagues and their roles" },
            ]}
          />
        }
      />
      <Block id="can" title="What buyers can do" lead="Everything from the first search to the purchase order.">
        <FeatureGrid items={CAN} />
      </Block>
      <Highlights id="why" title="Why buy on H2 Economy" items={WHY} />
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
        text="Save products, track quote requests and add colleagues. It takes about two minutes."
        actions={[
          { label: "Create a buyer account", href: "/join/buyer" },
          { label: "Buyer sign in", href: "/buyer/sign-in", primary: false },
        ]}
      />
    </main>
  );
}
