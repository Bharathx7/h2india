import { Alert, buttonClasses, cx, Icon, OrgCard, SchemeCard, StatusBadge, Switch } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { tenderStatus } from "@/cms/records/status";
import { ShareButton } from "@/news/client";
import { dayMonthYear } from "@/news/format";
import { companiesBySlug, companiesFor, getTender } from "@/opportunities/data";
import { Crumbs, Documents, memberHref, NewsList, Section, wrap } from "@/opportunities/parts";
import { dayMonth, daysLeft, initialsOf, toneOf } from "@/opportunities/views";
import { newsForTopics, schemeView } from "@/schemes/data";
import { siteViewer } from "@/server/site";
import type { Scheme, Topic } from "@/payload-types";

// Tender detail (open 457:3222, awarded 459:3621; step 5.5). Everything links to the issuer's portal: H2 Economy does
// not host tender documents or take bids. Track and Follow results sign people in; alerts arrive in step 7.3 (A71).

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getTender((await params).slug);
  if (!t) return { title: "Not found · H2 Economy" };
  return {
    title: `${t.title} · ${t.issuer} tender · H2 Economy`,
    description: t.description.slice(0, 200),
    alternates: { canonical: `/opportunities/tenders/${t.slug}` },
  };
}

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
const dateTime = (iso: string) => `${dayMonthYear(iso)}, ${time(iso)} IST`;
/** "15:00" → shown only when the time isn't midnight (a date-only key date). */
const when = (iso: string) => (time(iso) === "00:00" ? dayMonthYear(iso) : dateTime(iso));

function Rows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-col rounded-card border border-default">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-1 gap-1 border-b border-default px-4 py-3 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-4"
        >
          <dt className="type-caption text-secondary">{r.label}</dt>
          <dd className="type-body-sm text-primary">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Facts({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    <section aria-labelledby="facts" className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <h2 id="facts" className="type-h4 text-primary">
        Key facts
      </h2>
      <dl className="flex flex-col gap-3">
        {facts.map((f) => (
          <div key={f.label} className="flex flex-col gap-0.5">
            <dt className="type-label-sm text-secondary">{f.label}</dt>
            <dd className="type-body-sm text-primary">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** "Get updates on this tender" (457:3222) and "Follow results" (459:3621). Channels are chosen on the alert page. */
function Updates({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <section
      id="track"
      aria-labelledby="updates"
      className="flex scroll-mt-24 flex-col gap-3 rounded-card border border-default bg-page p-5"
    >
      <h2 id="updates" className="type-h4 text-primary">
        {title}
      </h2>
      <p className="type-body-sm text-body">{text}</p>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <Switch label="Email" checked disabled />
        <Switch label="WhatsApp" checked={false} disabled />
      </div>
      <Link href={href} className={cx(buttonClasses({ variant: "primary" }), "w-full")}>
        Track tender
      </Link>
    </section>
  );
}

export default async function TenderPage({ params }: { params: Params }) {
  const { slug } = await params;
  const t = await getTender(slug);
  if (!t) notFound();
  const now = new Date();
  const viewer = await siteViewer();
  const status = tenderStatus(t, now);
  const awarded = status === "Awarded";
  const open = new Date(t.bidDueAt) > now;
  const schemes = (t.schemes ?? []).filter((s): s is Scheme => typeof s === "object");
  const topics = (t.topics ?? []).filter((x): x is Topic => typeof x === "object");
  const result = t.result;
  const winners = result?.winners ?? [];
  const [news, couldBid, profiles] = await Promise.all([
    newsForTopics(
      topics.map((x) => x.id),
      3,
    ),
    awarded ? Promise.resolve([]) : companiesFor([t.sector ?? "", ...(t.category ?? "").split("›")]),
    companiesBySlug(winners.map((w) => w.profileSlug ?? "")),
  ]);
  const trackHref = memberHref(Boolean(viewer), `/member/alerts?tender=${t.slug}`);
  const ministry = schemes.find((s) => s.ministry && s.ministry !== t.issuer)?.ministry;
  const issuerLine = ministry ? `${t.issuer} for ${ministry}` : t.issuer;
  const portal = t.issuer;

  const extended = t.extendedFrom ? ` · extended from ${dayMonth(t.extendedFrom)}` : "";
  // The editor's order, with Published first and Bid due before the openings and the auction (457:3222).
  const others = (t.keyDates ?? []).map((k) => ({ label: k.label, at: k.at ?? null, note: k.note ?? null }));
  const after = others.findIndex((k) => /opening|auction|evaluation|award/i.test(k.label));
  const bid = { label: "Bid due", at: t.bidDueAt, note: null, bid: true };
  const keyDates = [
    ...(t.publishedAt ? [{ label: "Published", at: t.publishedAt, note: null }] : []),
    ...(after === -1 ? [...others, bid] : [...others.slice(0, after), bid, ...others.slice(after)]),
  ].map((d) => ({
    label: d.label,
    value: (
      <span className="type-spec">
        {d.at ? ("bid" in d ? `${dateTime(d.at)}${extended}` : when(d.at)) : null}
        {d.at && d.note ? ` · ${d.note}` : (d.note ?? "")}
      </span>
    ),
  }));
  const facts = [
    { label: "Issuer", value: issuerLine },
    ...(schemes.length ? [{ label: "Scheme", value: schemes.map((s) => s.name).join(", ") }] : []),
    { label: "Bid due", value: dateTime(t.bidDueAt) },
    ...(t.whoCanBid ? [{ label: "Who can bid", value: t.whoCanBid }] : []),
  ];
  const declared = result?.declaredAt ? result.dateLabel?.trim() || dayMonthYear(result.declaredAt) : null;
  const first = winners[0];
  const analysis = typeof result?.analysis === "object" && result.analysis ? result.analysis : null;
  const verified = t.verification?.at ? dayMonthYear(t.verification.at) : null;
  const scheme = schemes[0];

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-3 py-8")}>
          <Crumbs
            items={[
              { label: "Opportunities", href: "/opportunities" },
              { label: "Tenders", href: "/opportunities/tenders" },
              { label: t.tenderId },
            ]}
          />
          <p className="flex items-center gap-2 type-label-sm text-link">
            <span className="flex size-7 items-center justify-center rounded-pill bg-page type-label-sm text-primary">
              {initialsOf(t.issuer)}
            </span>
            {[t.issuer, t.issuerName].filter(Boolean).join(" · ")}
          </p>
          <h1 className="max-w-200 type-h1 text-primary">{t.title}</h1>
          <p className="type-spec text-secondary">{t.tenderId}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-3">
              <StatusBadge status={status} tone={toneOf(status)} />
              <span className="type-label-sm text-primary">
                {awarded && declared
                  ? `Results declared ${declared}`
                  : open
                    ? `Bid due ${dateTime(t.bidDueAt)} · ${daysLeft(t.bidDueAt, now)}`
                    : `Bids closed ${dateTime(t.bidDueAt)}`}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={trackHref} className={buttonClasses({ variant: "primary" })}>
                {awarded ? "Track tender" : "Track tender"}
              </Link>
              <a
                href={t.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "outline" })}
              >
                Documents on {portal} portal ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
              <ShareButton title={t.title} />
            </div>
          </div>
        </div>
      </div>

      <div className={cx(wrap, "flex flex-col gap-8 py-8 lg:flex-row lg:items-start lg:gap-12")}>
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-10">
          {awarded && result ? (
            <Section id="results" title="Results">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                {[
                  { label: "Winner", value: result.winnersLine?.trim() || first?.name || "Not public" },
                  { label: "Capacity", value: result.capacityLine?.trim() || first?.capacity || "Not public" },
                  { label: "Discovered price", value: result.price?.trim() || first?.price || "Not public" },
                  { label: "Bidders", value: result.bidders?.trim() || "Not public" },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col gap-1 rounded-card bg-subtle p-4">
                    <dt className="type-label-sm text-secondary">{f.label}</dt>
                    <dd className="type-spec text-primary">{f.value}</dd>
                  </div>
                ))}
              </dl>
              {winners.length ? (
                <>
                  <p className="type-label-sm text-secondary">{winners.length > 1 ? "Awardees" : "Awardee"}</p>
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {winners.map((w) => {
                      const p = w.profileSlug ? profiles.get(w.profileSlug) : undefined;
                      return (
                        <li key={w.id ?? w.name} className="flex flex-col gap-3 rounded-card border border-default p-4">
                          <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-control bg-mint type-label text-primary">
                              {p?.initials ?? initialsOf(w.name)}
                            </span>
                            <span className="flex flex-col">
                              <span className="type-label text-primary">{w.name}</span>
                              {w.place ? <span className="type-caption text-secondary">{w.place}</span> : null}
                            </span>
                          </div>
                          {w.about ? <p className="type-body-sm text-body">{w.about}</p> : null}
                          {w.capacity || w.price ? (
                            <p className="type-spec text-secondary">
                              {[w.capacity, w.price].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                          {p ? (
                            <div className="flex items-center justify-between border-t border-default pt-3">
                              <Link href={p.href} className="type-label-sm text-link hover:underline">
                                View profile →<span className="sr-only"> of {w.name}</span>
                              </Link>
                              <Link
                                href={`/rfq/new?supplier=${encodeURIComponent(w.profileSlug ?? "")}`}
                                className={buttonClasses({ variant: "outline", size: "sm" })}
                              >
                                Request a quote
                              </Link>
                            </div>
                          ) : (
                            <p className="type-caption text-secondary">Not on H2 Economy yet</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
              {result.whatItMeans ? (
                <div className="flex flex-col gap-2 rounded-card bg-mint p-4">
                  <p className="type-label text-primary">What it means</p>
                  <p className="type-body-sm text-body">{result.whatItMeans}</p>
                  {analysis ? (
                    <Link href={`/news/${analysis.slug}`} className="type-label-sm text-link hover:underline">
                      {analysis.title} →
                    </Link>
                  ) : null}
                </div>
              ) : null}
              {result.source || verified ? (
                <p className="type-caption text-secondary">
                  {[result.source ? `Source: ${result.source}` : null, verified ? `Last verified ${verified}` : null]
                    .filter(Boolean)
                    .join(". ")}
                  .
                </p>
              ) : null}
            </Section>
          ) : null}

          <Section id="dates" title="Key dates">
            <Rows rows={keyDates} />
          </Section>

          <Section id="value" title="Value and fees">
            <Rows
              rows={[
                { label: "Estimated value", value: t.value?.trim() || "Not published." },
                { label: "Bid security (EMD)", value: t.emd?.trim() || "Not published." },
                { label: "Document fee", value: t.documentFee?.trim() || "Not published." },
              ]}
            />
          </Section>

          <Section id="what" title="What this tender is for">
            <p className="type-body text-body">{t.description}</p>
          </Section>

          {(t.eligibility ?? []).length ? (
            <Section id="who" title="Who can bid">
              <ul className="flex flex-col gap-3">
                {(t.eligibility ?? []).map((e) => (
                  <li key={e.id ?? e.condition} className="flex items-start gap-2.5 type-body-sm text-body">
                    <Icon name="check-circle" size={18} className="mt-0.5 shrink-0 text-icon-primary" />
                    {e.condition}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {(t.documents ?? []).length ? (
            <Section id="documents" title="Documents">
              <Documents
                items={t.documents ?? []}
                note="H2 Economy links to the official portal and does not host tender documents."
              />
            </Section>
          ) : null}

          {(t.corrigenda ?? []).length ? (
            <Section id="corrigenda" title="Corrigenda">
              <Rows
                rows={(t.corrigenda ?? []).map((c) => ({
                  label: `${c.title} · ${dayMonthYear(c.date)}`,
                  value: c.change ?? "",
                }))}
              />
            </Section>
          ) : null}

          {!awarded ? (
            <Section id="results" title="Results">
              <Alert tone="success" title="Results not announced yet">
                Track this tender and we’ll email you when {t.issuer} publishes the winners and prices.
              </Alert>
            </Section>
          ) : null}

          {couldBid.length ? (
            <Section id="bidders" title="Companies that could bid">
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {couldBid.map((c) => (
                  <li key={c.id} className="flex">
                    <OrgCard
                      className="w-full"
                      name={c.title}
                      type={c.types[0]}
                      place={[c.city, c.state].filter(Boolean).join(", ")}
                      initials={c.initials}
                      gstVerified={c.verified}
                      summary={c.categories.length ? c.categories.join(", ") : c.summary}
                      href={c.href}
                      quoteHref={`/rfq/new?supplier=${encodeURIComponent(c.href.split("/").at(-1) ?? "")}`}
                      renderLink={({ href, className, children }) => (
                        <Link href={href} className={className}>
                          {children}
                        </Link>
                      )}
                    />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {news.length ? (
            <Section id="news" title="Related news">
              <NewsList items={news} />
            </Section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <Facts facts={facts} />
          {awarded ? (
            <Updates
              title="Follow results"
              text={`Get an email if the award changes or ${t.issuer} publishes delivery updates.`}
              href={trackHref}
            />
          ) : (
            <Updates
              title="Get updates on this tender"
              text={`Corrigenda, extensions and results, as soon as ${t.issuer} publishes them.`}
              href={trackHref}
            />
          )}
          {!awarded && scheme ? <SchemeCard {...schemeView(scheme, now)} /> : null}
        </aside>
      </div>
    </main>
  );
}
