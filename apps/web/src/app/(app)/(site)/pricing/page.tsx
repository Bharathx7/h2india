import type { Metadata } from "next";
import Link from "next/link";
import { Alert, buttonClasses, cx, Icon } from "@h2india/ui";
import { pricing } from "@/trust/data";
import { Block, card, DarkCta, Faqs, Hero, main, wrap } from "@/trust/parts";

// Pricing (512:148). Every price, the launch offer and the rate card version are editor-entered (Pricing in the CMS)
// because C1, C3 and M16 are still open; nothing here is written in code. Sections without prices say so.
// Founder (20 Nov 2026): supplier plans show as entered; commission and add-ons are shared on request, so the page
// shows them blurred and locked with Contact us. Their figures are never sent to the browser.

export const metadata: Metadata = {
  title: "Pricing · H2 Economy",
  description: "Free for buyers. Simple for suppliers: listing is free, and paid plans add tools.",
  alternates: { canonical: "/pricing" },
};
export const dynamic = "force-dynamic";

/** A section shared on request: placeholder cards blurred behind a lock, and one way to ask. No figures at all. */
function Locked({ what, cards }: { what: string; cards: number }) {
  return (
    <div className="relative isolate overflow-hidden rounded-feature border border-default bg-subtle p-4 md:p-6">
      <ul
        aria-hidden="true"
        className={cx("grid grid-cols-1 gap-4 blur-sm select-none sm:grid-cols-2", cards > 2 && "lg:grid-cols-4")}
      >
        {Array.from({ length: cards }, (_, i) => (
          <li key={i} className={cx(card, "flex flex-col gap-3 p-5")}>
            <span className="h-3 w-24 rounded-pill bg-tint" />
            <span className="type-h2 text-primary">₹ ••••</span>
            <span className="h-2.5 w-full rounded-pill bg-subtle" />
            <span className="h-2.5 w-4/5 rounded-pill bg-subtle" />
            <span className="h-2.5 w-3/5 rounded-pill bg-subtle" />
          </li>
        ))}
      </ul>
      <div className="absolute inset-0 flex items-center justify-center bg-page/40 p-4">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-feature border border-default bg-page px-6 py-6 text-center shadow-ink-float">
          <span className="flex size-12 items-center justify-center rounded-pill bg-inverse text-inverse">
            <Icon name="lock" size={22} />
          </span>
          <p className="type-h4 text-primary">{what} are shared on request</p>
          <p className="type-body-sm text-body">
            Tell us about your company and what you sell, and we&apos;ll walk you through them.
          </p>
          <Link href="/contact?about=supplier" className={buttonClasses({ size: "sm" })}>
            Contact us for details
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Finalising({ what }: { what: string }) {
  return (
    <Alert tone="info" title={`${what} are being finalised`}>
      We&apos;ll publish them here before they apply to anyone. Listing your company is free meanwhile.
    </Alert>
  );
}

export default async function PricingPage() {
  const p = await pricing();
  const plans = p?.plans ?? [];
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="Pricing"
        title="Free for buyers. Simple for suppliers."
        lead="Suppliers list for free. Paid plans add tools, and a capped commission applies to orders paid through H2 Economy once the launch offer ends."
        actions={[
          { label: "List your company", href: "/list-your-company", primary: true },
          { label: "Contact us", href: "/contact?about=supplier" },
        ]}
        note={p?.rateCardNote ?? undefined}
      />
      <div className={cx(wrap, "pt-8")}>
        <section
          aria-labelledby="buyers"
          className="flex flex-col gap-3 rounded-card bg-subtle p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 id="buyers" className="type-label-lg text-primary">
              Buyers: free
            </h2>
            <p className="type-body-sm text-body">
              Search, compare, request quotes and order without paying H2 Economy. You pay only the supplier&apos;s
              price on their GST invoice.
            </p>
          </div>
          <Link
            href="/join/buyer"
            className={cx(buttonClasses({ variant: "outline", size: "sm" }), "shrink-0 bg-page")}
          >
            Create a buyer account
          </Link>
        </section>
      </div>
      <Block id="plans" title="Supplier plans" lead="Start free. Upgrade when you need more reach and tools.">
        {plans.length ? (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <li
                key={plan.name}
                className={cx(
                  "flex flex-col gap-4 rounded-card border bg-page p-5",
                  plan.highlight ? "border-2 border-accent" : "border-default",
                )}
              >
                <p className={cx("type-label-sm", plan.highlight ? "text-link" : "text-secondary")}>{plan.name}</p>
                <p className="flex items-baseline gap-2">
                  <span className="type-h1 text-primary">{plan.price}</span>
                  {plan.period ? <span className="type-caption text-secondary">{plan.period}</span> : null}
                </p>
                <p className="border-b border-default pb-4 type-body-sm text-body">{plan.summary}</p>
                <ul className="flex flex-1 flex-col gap-2">
                  {(plan.features ?? []).map((f) => (
                    <li key={f.text} className="flex items-start gap-2 type-body-sm text-body">
                      <Icon name="check-circle" size={16} className="mt-0.5 shrink-0 text-icon-primary" />
                      {f.text}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={buttonClasses({ variant: plan.highlight ? "primary" : "outline", size: "sm" })}
                >
                  {plan.cta}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Finalising what="Supplier plan prices" />
        )}
      </Block>
      <Block
        id="commission"
        title="Commission on orders"
        lead="Charged only on orders paid through H2 Economy. No sale, no fee. Listing is never charged commission."
      >
        <Locked what="Commission rates" cards={2} />
      </Block>
      <Block
        id="add-ons"
        title="Add-ons"
        lead="For any plan. Every paid placement is labelled, and none of them changes search ranking or badges."
      >
        <Locked what="Add-on prices" cards={4} />
      </Block>
      <Faqs id="questions" title="Pricing questions" items={p?.faqs ?? []} />
      <DarkCta
        eyebrow="For suppliers"
        title="Ready to sell?"
        text="Register your company in about 10 minutes. Keep your GST certificate handy."
        actions={[{ label: "List your company", href: "/list-your-company" }]}
      />
    </main>
  );
}
