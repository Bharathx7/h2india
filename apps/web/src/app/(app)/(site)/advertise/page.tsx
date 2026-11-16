import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, cx, Icon } from "@h2india/ui";
import { trustDetails } from "@/trust/data";
import { AdvertisingForm } from "@/trust/forms";
import { card, main, PageHead, wrap } from "@/trust/parts";

// Advertise and sponsor (741:5605). Audience figures come from Company and legal details with their source and
// date (A45), and are hidden until entered; prices are on Pricing (C3). Enquiries go to the Submissions queue (ADV-).

export const metadata: Metadata = {
  title: "Advertise and sponsor · H2 Economy",
  description:
    "Reach the people buying, building and regulating India's hydrogen economy. Every sponsored placement is labelled.",
  alternates: { canonical: "/advertise" },
};
export const dynamic = "force-dynamic";

const PLACEMENTS = [
  ["Newsletter sponsorship", 'One sponsor slot in H2 Economy Weekly each Monday, marked "Sponsored".'],
  [
    "Sponsored webinar",
    "You present; we host and moderate. Registrants are shared with you only if they tick a separate box.",
  ],
  ["Category partner", "Your brand on one marketplace category page and its buyer's guide, labelled as a partner."],
  ["Featured event", 'Your event pinned at the top of the events listing, labelled "Featured".'],
  ["Sponsored article", 'Written with you, checked by our editors, labelled "Sponsored" and never mixed with news.'],
] as const;

const CREATIVES = [
  "Newsletter slot · 600 × 200",
  "Category partner banner · 1200 × 160",
  "Featured event card",
] as const;

export default async function AdvertisePage() {
  const t = await trustDetails();
  return (
    <main id="main" className={main}>
      <PageHead
        crumbs={[{ label: "Company", href: "/about" }, { label: "Advertise and sponsor" }]}
        title="Advertise and sponsor"
        lead="Reach the people buying, building and regulating India's hydrogen economy. Every sponsored placement is labelled."
        aside={
          t.mediaKitUrl ? (
            <a href={t.mediaKitUrl} className={cx(buttonClasses({ variant: "outline" }), "shrink-0")}>
              <Icon name="download" size={16} /> Download media kit (PDF)
            </a>
          ) : null
        }
      />
      <div className={cx(wrap, "flex flex-col gap-6 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {t.audience.length ? (
            <section aria-labelledby="audience" className={cx(card, "flex flex-col gap-3 p-5")}>
              <div>
                <h2 id="audience" className="type-h4 text-primary">
                  Our audience
                </h2>
                <p className="type-caption text-secondary">
                  Figures are dated and come from our own analytics and lists. We never round up.
                </p>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {t.audience.map((f) => (
                  <li key={f.label} className="flex flex-col gap-1 rounded-card bg-subtle p-4">
                    <span className="type-h4 text-primary">{f.value}</span>
                    <span className="type-caption text-secondary">
                      {f.label} · {f.asOf} · {f.source}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="placements" className={cx(card, "flex flex-col p-5")}>
            <h2 id="placements" className="pb-3 type-h4 text-primary">
              Placements
            </h2>
            <ul className="flex flex-col divide-y divide-default border-t border-default">
              {PLACEMENTS.map(([title, text]) => (
                <li key={title} className="flex items-start justify-between gap-4 py-3">
                  <span className="flex flex-col gap-0.5">
                    <span className="type-label text-primary">{title}</span>
                    <span className="type-body-sm text-body">{text}</span>
                  </span>
                  <span className="shrink-0 rounded-pill bg-subtle px-2 py-0.5 type-caption text-secondary">
                    • Labelled
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="creatives" className={cx(card, "flex flex-col gap-3 p-5")}>
            <div>
              <h2 id="creatives" className="type-h4 text-primary">
                Example creatives
              </h2>
              <p className="type-caption text-secondary">
                Illustrations of how placements appear. Your artwork follows our ad specs.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CREATIVES.map((c) => (
                <li key={c} className="flex flex-col gap-2">
                  <div aria-hidden="true" className="flex h-24 flex-col gap-2 rounded-card bg-subtle p-3">
                    <span className="type-caption text-primary">• Sponsored</span>
                    <span className="type-label-sm text-secondary">Your headline here</span>
                  </div>
                  <span className="type-caption text-secondary">{c}</span>
                </li>
              ))}
            </ul>
          </section>
          <div className="flex flex-col gap-3 rounded-card bg-mint p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 type-body-sm text-body">
              <Icon name="shield-check" size={20} className="shrink-0 text-icon-primary" />
              Advertisers never see stories before they&apos;re published, and no payment buys a badge or a better place
              in search.
            </p>
            <Link href="/legal/sponsored-content" className="shrink-0 type-label-sm text-link">
              Sponsored content policy
            </Link>
          </div>
        </div>
        <aside className="lg:w-80 lg:shrink-0">
          <AdvertisingForm />
        </aside>
      </div>
    </main>
  );
}
