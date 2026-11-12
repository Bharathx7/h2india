import type { Metadata } from "next";
import Link from "next/link";
import { Alert, buttonClasses, cx, Icon } from "@h2india/ui";
import { pricing } from "@/trust/data";
import { Block, card, DarkCta, Faqs, Hero, main, wrap } from "@/trust/parts";

// Pricing (512:148). Every price, the launch offer and the rate card version are editor-entered (Pricing in the CMS)
// because C1, C3 and M16 are still open; nothing here is written in code. Sections without prices say so.

export const metadata: Metadata = {
  title: "Pricing · H2 India",
  description: "Free for buyers. Simple for suppliers: listing is free, and paid plans add tools.",
  alternates: { canonical: "/pricing" },
};
export const dynamic = "force-dynamic";

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
  const c = p?.commission;
  const hasCommission = Boolean(c?.launchValue || c?.afterValue);
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="Pricing"
        title="Free for buyers. Simple for suppliers."
        lead="Suppliers list for free. Paid plans add tools, and a capped commission applies to orders paid through H2 India once the launch offer ends."
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
              Search, compare, request quotes and order without paying H2 India. You pay only the supplier&apos;s price
              on their GST invoice.
            </p>
          </div>
          <Link
            href="/join?as=buyer"
            className={cx(buttonClasses({ variant: "outline", size: "sm" }), "shrink-0 bg-page")}
          >
            Create a buyer account
          </Link>
        </section>
      </div>
      <Block id="plans" title="Supplier plans" lead="Start free. Upgrade when you need more reach and tools.">
        {plans.length ? (
          <ul className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <li
                key={plan.name}
                className={cx(
                  "flex flex-col gap-4 rounded-card border bg-page p-5",
                  plan.highlight ? "border-2 border-accent" : "border-default",
                )}
              >
                <p className={cx("type-eyebrow", plan.highlight ? "text-link" : "text-secondary")}>{plan.name}</p>
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
        lead="Charged only on orders paid through H2 India. No sale, no fee. Listing is never charged commission."
      >
        {hasCommission && c ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {c.launchValue ? (
                <div className={cx(card, "flex flex-col gap-1 p-5")}>
                  <p className="type-eyebrow text-secondary">Launch offer</p>
                  <p className="type-h1 text-primary">{c.launchValue}</p>
                  {c.launchNote ? <p className="type-label text-primary">{c.launchNote}</p> : null}
                  <p className="type-body-sm text-body">No commission on any order while the launch offer runs.</p>
                </div>
              ) : null}
              {c.afterValue ? (
                <div className={cx(card, "flex flex-col gap-1 p-5")}>
                  <p className="type-eyebrow text-secondary">After launch</p>
                  <p className="type-h1 text-primary">{c.afterValue}</p>
                  {c.afterNote ? <p className="type-label text-primary">{c.afterNote}</p> : null}
                  {c.afterDetail ? <p className="type-body-sm text-body">{c.afterDetail}</p> : null}
                </div>
              ) : null}
            </div>
            {c.examples?.length ? (
              <div tabIndex={0} role="region" aria-label="Worked examples" className={cx(card, "overflow-x-auto")}>
                <table className="w-full text-left">
                  <thead className="bg-subtle type-caption text-secondary">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-normal">
                        Worked example (after the launch offer)
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-normal">
                        Commission
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default">
                    {c.examples.map((e) => (
                      <tr key={e.order}>
                        <td className="px-4 py-3 type-body-sm text-primary">{e.order}</td>
                        <td className="px-4 py-3 text-right type-spec text-primary">{e.commission}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {c.footnote ? <p className="type-caption text-secondary">{c.footnote}</p> : null}
          </>
        ) : (
          <Finalising what="Commission rates" />
        )}
      </Block>
      <Block
        id="add-ons"
        title="Add-ons"
        lead="For any plan. Every paid placement is labelled, and none of them changes search ranking or badges."
      >
        {p?.addOns?.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {p.addOns.map((a) => (
              <li key={a.name} className={cx(card, "flex flex-col gap-1 p-5")}>
                <p className="type-label text-primary">{a.name}</p>
                <p className="type-h4 text-primary">
                  {a.price} {a.unit ? <span className="type-caption text-secondary">{a.unit}</span> : null}
                </p>
                <p className="type-body-sm text-body">{a.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Finalising what="Add-on prices" />
        )}
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
