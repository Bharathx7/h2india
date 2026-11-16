import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, cx, Icon, Logo } from "@h2india/ui";
import { teamMembers, trustDetails } from "@/trust/data";
import { CopyText } from "@/trust/CopyText";
import { card, main, PageHead, wrap } from "@/trust/parts";
import { initials } from "@/trust/views";

// Media kit (741:6058): the logo on white and on ink, the brand colours (names only: values live in the tokens),
// the boilerplate, the founder and the dated audience figures (A45). Logo files and the PDF arrive with the design
// team's export; until then the download buttons are hidden.

export const metadata: Metadata = {
  title: "Media kit · H2 Economy",
  description: "Logos, colours, a boilerplate and facts about H2 Economy for journalists and partners.",
  alternates: { canonical: "/media-kit" },
};
export const dynamic = "force-dynamic";

const COLOURS = [
  { name: "H2 Economy green", swatch: "bg-accent", border: false },
  { name: "Ink", swatch: "bg-inverse", border: false },
  { name: "Mint", swatch: "bg-mint", border: false },
  { name: "White", swatch: "bg-page", border: true },
] as const;

export default async function MediaKitPage() {
  const [t, team] = await Promise.all([trustDetails(), teamMembers()]);
  const founder = team.find((p) => p.founder);
  return (
    <main id="main" className={main}>
      <PageHead
        crumbs={[{ label: "Company", href: "/about" }, { label: "Media kit" }]}
        title="Media kit"
        lead="Logos, colours, a boilerplate and facts about H2 Economy for journalists and partners."
        aside={
          t.mediaKitUrl ? (
            <a href={t.mediaKitUrl} className={cx(buttonClasses({}), "shrink-0")}>
              <Icon name="download" size={16} /> Download media kit (PDF)
            </a>
          ) : null
        }
      />
      <div className={cx(wrap, "flex flex-col gap-6 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section aria-labelledby="logo" className={cx(card, "flex flex-col gap-3 p-5")}>
            <div>
              <h2 id="logo" className="type-h4 text-primary">
                Logo
              </h2>
              <p className="type-caption text-secondary">
                Use the logo on white or on ink. Don&apos;t stretch, recolour or add effects.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex h-24 items-center justify-center rounded-card border border-default bg-page">
                <Logo />
              </div>
              <div className="flex h-24 items-center justify-center rounded-card bg-inverse">
                <Logo version="primary-on-dark" />
              </div>
            </div>
          </section>
          <section aria-labelledby="colours" className={cx(card, "flex flex-col gap-3 p-5")}>
            <div>
              <h2 id="colours" className="type-h4 text-primary">
                Colours
              </h2>
              <p className="type-caption text-secondary">Our existing brand colours.</p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {COLOURS.map((c) => (
                <li key={c.name} className="flex flex-col gap-2">
                  <span
                    aria-hidden="true"
                    className={cx("h-14 rounded-card", c.swatch, c.border && "border border-default")}
                  />
                  <span className="type-label-sm text-primary">{c.name}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="boilerplate" className={cx(card, "flex flex-col gap-3 p-5")}>
            <h2 id="boilerplate" className="type-h4 text-primary">
              Boilerplate
            </h2>
            <p className="rounded-card bg-subtle p-4 type-body text-body">{t.boilerplate}</p>
            <CopyText text={t.boilerplate} label="Copy boilerplate" />
          </section>
          {founder ? (
            <section aria-labelledby="founder" className={cx(card, "flex flex-col gap-3 p-5")}>
              <h2 id="founder" className="type-h4 text-primary">
                Founder
              </h2>
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-mint type-h4 text-primary"
                >
                  {initials(founder.name)}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="type-label text-primary">{founder.name}</p>
                  <p className="type-body-sm text-body">{founder.bio ?? founder.role}</p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          {t.audience.length ? (
            <section aria-labelledby="glance" className={cx(card, "flex flex-col gap-2 p-5")}>
              <div>
                <h2 id="glance" className="type-h4 text-primary">
                  Audience at a glance
                </h2>
                <p className="type-caption text-secondary">Dated figures from our analytics and lists.</p>
              </div>
              <ul className="flex flex-col divide-y divide-default border-t border-default">
                {t.audience.map((f) => (
                  <li key={f.label} className="flex flex-col py-2.5">
                    <span className="type-h4 text-primary">{f.value}</span>
                    <span className="type-caption text-secondary">
                      {f.label} · {f.asOf} · {f.source}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="press" className={cx(card, "flex flex-col gap-2 p-5")}>
            <h2 id="press" className="type-h4 text-primary">
              Press contact
            </h2>
            <p className="type-body-sm text-body">
              {t.partnerships.name ? `${t.partnerships.name}, ${t.partnerships.role}. ` : ""}Use the contact form and
              choose &quot;Newsroom tip&quot; or &quot;Partnerships&quot;; we reply within 1 working day.
            </p>
            <Link
              href="/contact?about=tip"
              className={cx(buttonClasses({ variant: "outline", size: "sm" }), "self-start")}
            >
              Contact us
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
