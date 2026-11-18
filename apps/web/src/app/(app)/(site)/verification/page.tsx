import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, cx, Icon, type IconName } from "@h2india/ui";
import { Block, card, DarkCta, Hero, main, wrap } from "@/trust/parts";

// How verification works (95:1428): words as drawn. "Report a listing" opens the grievance form with Listing chosen.

export const metadata: Metadata = {
  title: "How verification works · H2 Economy",
  description:
    "Badges show what H2 Economy has checked about a company and when we last checked it. Badges are never sold.",
  alternates: { canonical: "/verification" },
};

const REPORT = "/legal/grievance-officer?type=Listing";

function Pill({ icon, label, muted = false }: { icon: IconName | null; label: string; muted?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 self-start rounded-pill pr-2.5 pl-2 type-label-sm whitespace-nowrap text-primary",
        muted ? "bg-subtle" : "bg-tint",
      )}
    >
      {icon ? <Icon name={icon} size={14} className="text-icon-link" /> : <span aria-hidden="true">•</span>}
      {label}
    </span>
  );
}

const BADGES: { pills: { icon: IconName | null; label: string; muted?: boolean }[]; title: string; text: string }[] = [
  {
    pills: [{ icon: "shield-check", label: "Verified supplier" }],
    title: "Verified",
    text: "We checked company documents, GSTIN and bank details. The badge shows when we last checked.",
  },
  {
    pills: [{ icon: "file-text", label: "SIGHT awardee" }],
    title: "SIGHT awardee",
    text: "Named in an official SIGHT selection list. We link to the list and the date we checked it.",
  },
  {
    pills: [
      { icon: null, label: "Made in India · self-declared", muted: true },
      { icon: "file-text", label: "Made in India · verified" },
    ],
    title: "Made in India",
    text: "Self-declared means the company says so. Verified means we saw a factory licence or visited the site.",
  },
  {
    pills: [{ icon: "file-text", label: "Authorised dealer" }],
    title: "Authorised dealer",
    text: "We hold a current letter from the brand naming this company as a dealer, with its expiry date.",
  },
  {
    pills: [{ icon: "file-text", label: "DPIIT recognised" }],
    title: "Start-up",
    text: "Holds a valid start-up recognition certificate from DPIIT.",
  },
];

const TIERS = [
  {
    tier: "Tier 0",
    name: "Basic",
    check: "Email and mobile number confirmed with a one-time code. GSTIN format and status checked on the GST portal.",
    often: "At sign-up",
    badge: null,
    shown: "No badge. The profile says Not verified yet.",
  },
  {
    tier: "Tier 1",
    name: "Verified",
    check:
      "GSTIN active and the legal name matches. PAN and CIN checked against Ministry of Corporate Affairs records. Bank account name matches. Certificates checked with the issuer.",
    often: "GSTIN and bank every 6 months. Certificates before they expire.",
    badge: "Verified supplier",
    shown: "Verified supplier, with the date of the last check",
  },
  {
    tier: "Tier 2",
    name: "Site-verified",
    check: "Everything in Tier 1, plus a site visit by H2 Economy or an approved inspector, and the factory licence.",
    often: "Site visit every 12 months",
    badge: "Site-verified",
    shown: "Verified supplier · site-verified",
  },
];

export default function VerificationPage() {
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="Trust"
        title="How verification works"
        lead="Badges show what H2 Economy has checked about a company and when we last checked it. Badges are never sold."
        actions={[{ label: "Report a listing", href: REPORT, primary: true }]}
      />
      <Block id="badges" title="What each badge means" lead="Every badge on a profile opens the checks behind it.">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((b) => (
            <li key={b.title} className={cx(card, "flex flex-col gap-3 p-5")}>
              <div className="flex flex-col gap-1.5">
                {b.pills.map((p) => (
                  <Pill key={p.label} {...p} />
                ))}
              </div>
              <h3 className="type-h4 text-primary">{b.title}</h3>
              <p className="type-body-sm text-body">{b.text}</p>
            </li>
          ))}
        </ul>
      </Block>
      <Block
        id="checks"
        title="The checks behind Verified"
        lead="Three tiers. The same checks for every company, whatever its size."
      >
        <div tabIndex={0} role="region" aria-label="The checks behind Verified" className={cx(card, "overflow-x-auto")}>
          <table className="w-full min-w-180 text-left">
            <thead className="bg-subtle type-caption text-secondary">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-normal">
                  Tier
                </th>
                <th scope="col" className="px-4 py-2.5 font-normal">
                  What we check
                </th>
                <th scope="col" className="px-4 py-2.5 font-normal">
                  How often we re-check
                </th>
                <th scope="col" className="px-4 py-2.5 font-normal">
                  Badge shown
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
              {TIERS.map((t) => (
                <tr key={t.tier} className="align-top">
                  <th scope="row" className="px-4 py-3 font-normal">
                    <span className="block type-label text-primary">{t.tier}</span>
                    <span className="type-caption text-secondary">{t.name}</span>
                  </th>
                  <td className="px-4 py-3 type-body-sm text-body">{t.check}</td>
                  <td className="px-4 py-3 type-body-sm text-body">{t.often}</td>
                  <td className="flex flex-col gap-1 px-4 py-3">
                    {t.badge ? <Pill icon="shield-check" label={t.badge} /> : null}
                    <span className="type-caption text-secondary">{t.shown}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
      <div className={cx(wrap, "pt-10")}>
        <section aria-labelledby="never-sold" className="flex items-start gap-4 rounded-card bg-mint p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-page text-icon-primary">
            <Icon name="shield-check" size={20} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="never-sold" className="type-h4 text-primary">
              Badges are never sold
            </h2>
            <p className="type-body-sm text-body">
              No plan, sponsorship or advert buys a badge, changes what we check, or changes where a company appears in
              search. Sponsored placements are always labelled.
            </p>
          </div>
        </section>
      </div>
      <Block id="removed" title="How a badge is removed">
        <p className={cx(card, "p-5 type-body-sm text-body")}>
          A badge comes off straight away if a certificate expires, the GSTIN is cancelled, a re-check fails or we
          confirm a complaint. We tell the company why and what to fix. Products from a suspended company are hidden
          until we check again.
        </p>
      </Block>
      <div className={cx(wrap, "pt-8")}>
        <section
          aria-labelledby="wrong"
          className={cx(card, "flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between")}
        >
          <div>
            <h2 id="wrong" className="type-h4 text-primary">
              Something wrong with a listing?
            </h2>
            <p className="type-body-sm text-body">Tell us and our team looks into it within 1 working day.</p>
          </div>
          <Link href={REPORT} className={cx(buttonClasses({ variant: "outline", size: "sm" }), "shrink-0")}>
            Report a listing
          </Link>
        </section>
      </div>
      <DarkCta
        eyebrow="Start sourcing"
        title="Buy hydrogen equipment from verified Indian suppliers"
        text="Buy fixed-price items now, or send one quote request to up to 5 suppliers. Every order ends in a GST invoice."
        actions={[
          { label: "Request a quote", href: "/rfq/new" },
          { label: "Sell on H2 Economy", href: "/for-suppliers", primary: false },
        ]}
      />
    </main>
  );
}
