import { Button, CategoryTile, EmptyState, Icon, type IconName } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { catalogue } from "@/marketplace/data";
import { applicationHref, categoryHref, classHref, HOME_APPLICATIONS, popularCategories } from "@/marketplace/views";
import { Section, SectionTitle } from "./parts";

// Home sections 06 to 08 (377:4917; phones 381:5845).

/**
 * 06 Browse the marketplace (377:5143): the five classes, popular categories and browse by application, read from the
 * live catalogue (step 6.2) so admin Catalogue changes show here at once; without counts until there are listings
 * (A43, A109). Phones show the classes and applications (381:5966).
 */
export async function Marketplace() {
  const cat = await catalogue();
  // The home draws six popular categories (377:5217); the marketplace landing draws eight.
  const popular = popularCategories(cat).slice(0, 6);
  return (
    <Section id="marketplace" className="bg-page" inner="flex flex-col gap-5 py-12 md:gap-8 md:py-24">
      <SectionTitle
        id="marketplace"
        eyebrow="Marketplace"
        title="Browse the marketplace"
        link={{ label: "Explore the marketplace", href: "/marketplace" }}
        className="items-center text-center md:items-end md:text-left"
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-5">
        {cat.classes.map((c) => (
          <CategoryTile
            key={c.id}
            title={c.label}
            href={classHref(c.id)}
            icon="zap"
            size="class"
            className="max-md:[&>span:first-child]:h-11"
          />
        ))}
      </div>
      <h3 className="hidden type-h4 text-primary md:block">Popular categories</h3>
      <div className="hidden gap-6 md:grid md:grid-cols-3 lg:grid-cols-6">
        {popular.map((c) => (
          <CategoryTile key={c.id} title={c.label} href={categoryHref(c)} icon={ICONS[c.slug] ?? "zap"} />
        ))}
      </div>
      <h3 className="type-h4 text-primary">Browse by application</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-6">
        {cat.applications
          .filter((a) => HOME_APPLICATIONS.includes(a.id))
          .map((a) => (
            <CategoryTile
              key={a.id}
              title={a.shortLabel}
              detail={a.examples || undefined}
              href={applicationHref(a.id)}
              icon={ICONS[a.id] ?? "zap"}
            />
          ))}
      </div>
    </Section>
  );
}

/** The icons drawn on the home tiles (377:5217, 850:209). */
const ICONS: Record<string, IconName> = {
  "storage-transport": "package",
  "refuelling-mobility": "truck",
  "industrial-use": "clipboard-check",
  "safety-testing": "shield-check",
};

/**
 * 07 Featured products (379:3897). The catalogue arrives in Stage 6, so the module shows its empty state (A43); the
 * carousel and its arrows appear with the first featured products.
 */
export function FeaturedProducts() {
  return (
    <Section id="featured" className="bg-page" inner="flex flex-col gap-5 py-12 md:gap-8 md:py-24">
      <SectionTitle
        id="featured"
        eyebrow="Featured"
        title="Featured products"
        sub="Curated by H2 Economy. Prices appear only on product pages."
        link={{ label: "Explore the marketplace", href: "/marketplace" }}
      />
      <div className="rounded-card border border-default bg-subtle" data-testid="featured-empty">
        <EmptyState
          kind="first-use"
          title="Featured products are on the way"
          action={
            <Button asChild>
              <Link href="/list-your-company">List your products</Link>
            </Button>
          }
        >
          Products show here once suppliers list them and our team has checked them.
        </EmptyState>
      </div>
    </Section>
  );
}

function Tile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      data-reveal-item=""
      className={`relative flex flex-col gap-6 overflow-hidden rounded-modal border border-default p-6 shadow-soft md:p-8 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function TileText({ title, children, dark }: { title: string; children: ReactNode; dark?: boolean }) {
  return (
    <div className="relative flex flex-col gap-2">
      <h3 className={`type-h3 ${dark ? "text-inverse" : "text-primary"}`}>{title}</h3>
      <p className={`type-body ${dark ? "text-neutral-0/80" : "text-body"}`}>{children}</p>
    </div>
  );
}

const panel = "rounded-card border border-default bg-page shadow-ink-float-sm";

const ORDER_STEPS: { title: string; note: string; state: "done" | "now" | "next" }[] = [
  { title: "Confirmed by the supplier", note: "Within 48 h", state: "done" },
  { title: "Paid into escrow", note: "Held by payment partner", state: "done" },
  { title: "Dispatched", note: "Invoice and e-way bill attached", state: "now" },
  { title: "Delivered", note: "Receiving contact enters the code", state: "next" },
  { title: "Accepted by you", note: "Step-up check", state: "next" },
  { title: "Supplier paid", note: "2 working days after acceptance", state: "next" },
];

const QUOTES = [
  { supplier: "Hydrotek Systems", lead: "14–16 wk", fit: "92%" },
  { supplier: "PEM Power India", lead: "18–20 wk", fit: "86%" },
  { supplier: "Deccan Electrolysis", lead: "20–24 wk", fit: "81%" },
];

function Check({ children, icon = "check-circle" }: { children: ReactNode; icon?: IconName }) {
  return (
    <li className="flex items-center gap-2 type-label-sm text-primary">
      <Icon name={icon} size={18} className="text-icon-success" />
      {children}
    </li>
  );
}

/**
 * 08 Platform features (851:376): the bento of how an order runs. The visuals are illustrations labelled as an example
 * (Bento visual components 845:10886 to 845:10977), not data.
 */
export function PlatformFeatures() {
  return (
    <Section id="platform" className="bg-page" inner="flex flex-col gap-5 py-12 md:gap-10 md:py-24">
      <div className="flex flex-col gap-2">
        <p className="type-eyebrow text-secondary">Why buy and sell on H2 Economy</p>
        <h2 id="platform-title" className="type-h2 text-primary md:type-h1">
          One process, from request to GST invoice
        </h2>
        <p className="type-body text-body md:type-body-lg">
          Every order follows the same checked steps, so buyers and suppliers always know what happens next.
        </p>
      </div>
      <div className="flex flex-col gap-5 md:gap-6">
        <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-2">
          <Tile className="bg-mint lg:h-171">
            <div aria-hidden="true" className="depth-accent-glow absolute top-30 left-40 size-160" />
            <TileText title="Confirm, then pay">
              The supplier confirms your order before you pay. Your money is held by our payment partner and released
              only after you accept delivery.
            </TileText>
            <div className="relative flex flex-1 items-end justify-end">
              <div
                className={`${panel} flex w-full max-w-115 flex-col gap-3.5 p-6`}
                aria-label="Example order"
                role="group"
              >
                <p className="type-eyebrow text-secondary">Example order · PEM electrolyser 1 MW</p>
                <ol className="flex flex-col gap-3.5">
                  {ORDER_STEPS.map((s) => (
                    <li key={s.title} className="flex items-center gap-3">
                      {s.state === "done" ? (
                        <span className="flex size-6 items-center justify-center rounded-pill bg-accent text-icon-primary">
                          <Icon name="check" size={14} />
                        </span>
                      ) : (
                        <span
                          className={`size-6 rounded-pill bg-page ${s.state === "now" ? "border-2 border-selected" : "border border-control"}`}
                        />
                      )}
                      <span className="flex flex-col">
                        <span className={`type-label ${s.state === "next" ? "text-secondary" : "text-primary"}`}>
                          {s.title}
                        </span>
                        <span className="type-caption text-secondary">{s.note}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Tile>
          <div className="flex flex-col gap-5 md:gap-6">
            <Tile className="bg-page md:flex-row lg:h-70">
              <div className="md:w-55 md:shrink-0">
                <TileText title="Compare quotes side by side">
                  Every supplier answers in the same format: lead time, warranty, compliance and fit to spec.
                </TileText>
              </div>
              <div className="flex flex-1 items-center">
                <table
                  className={`${panel} w-full overflow-hidden text-left type-caption whitespace-nowrap`}
                  aria-label="Example quotes"
                >
                  <thead className="bg-subtle type-label-sm text-secondary">
                    <tr className="border-b border-default">
                      <th className="px-3.5 py-2.5 font-semibold">Supplier</th>
                      <th className="px-3.5 py-2.5 font-semibold">Lead time</th>
                      <th className="px-3.5 py-2.5 font-semibold">Fit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUOTES.map((q, i) => (
                      <tr
                        key={q.supplier}
                        className={i === 0 ? "border-b border-default bg-mint" : i < 2 ? "border-b border-default" : ""}
                      >
                        <td className="px-3.5 py-2.5 type-label-sm text-primary">{q.supplier}</td>
                        <td className="px-3.5 py-2.5 text-primary">{q.lead}</td>
                        <td className={`px-3.5 py-2.5 ${i === 0 ? "text-link" : "text-primary"}`}>{q.fit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tile>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <Tile className="bg-page lg:h-95">
                <TileText title="Documents checked">
                  GSTIN, PAN, bank name match and certificates such as PESO and BIS, checked before a listing goes live.
                </TileText>
                <div className="flex flex-1 items-end">
                  <ul className={`${panel} flex w-full flex-col gap-2.5 p-4`}>
                    <Check>GSTIN and PAN</Check>
                    <Check>Bank name match</Check>
                    <Check>PESO and BIS certificates</Check>
                  </ul>
                </div>
              </Tile>
              <Tile className="bg-page lg:h-95">
                <TileText title="GST-ready invoicing">
                  A GST invoice on every order, with TCS and TDS shown on each payout.
                </TileText>
                <div className="flex flex-1 items-end">
                  <div className={`${panel} flex w-full flex-col gap-2 p-4`}>
                    <p className="flex items-center gap-2 type-label text-primary">
                      <Icon name="file-text" size={18} className="text-icon-link" />
                      Tax invoice
                    </p>
                    <dl className="flex flex-col gap-2">
                      {[
                        ["IRN", "Generated"],
                        ["IGST", "18%"],
                        ["TCS · TDS", "On payout"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-baseline justify-between">
                          <dt className="type-caption text-secondary">{k}</dt>
                          <dd className="type-spec text-primary">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </Tile>
            </div>
          </div>
        </div>
        <div
          data-reveal-item=""
          className="relative flex flex-col gap-6 overflow-hidden rounded-modal bg-inverse p-6 md:p-8 lg:h-50 lg:flex-row"
        >
          <div aria-hidden="true" className="depth-deep-glow absolute -top-90 left-[56%] size-175" />
          <div className="relative lg:w-96 lg:shrink-0">
            <TileText title="Track every delivery" dark>
              Invoice, e-way bill and carrier tracking in one place. The receiving contact confirms arrival with a
              delivery code.
            </TileText>
          </div>
          <div className="relative flex flex-1 items-center">
            <ol
              aria-label="Example delivery"
              className="grid w-full grid-cols-2 gap-2 rounded-card border border-neutral-0/12 bg-neutral-0/6 p-5 backdrop-blur-glass-16 md:grid-cols-5"
            >
              {["Invoice", "E-way bill", "In transit", "Delivered", "Code confirmed"].map((stage, i) => (
                <li key={stage} className="flex flex-col gap-2">
                  <span className={`h-1 rounded-[2px] ${i < 3 ? "bg-accent" : "bg-neutral-0/16"}`} />
                  <span className={`type-label-sm ${i < 3 ? "text-inverse" : "text-neutral-0/64"}`}>{stage}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Section>
  );
}
