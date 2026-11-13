import config from "@payload-config";
import { getDb } from "@h2india/core";
import { companyProfile } from "@h2india/core/companies";
import { storefrontProducts } from "@h2india/core/products";
import { publicBadges } from "@h2india/core/supplier";
import { formatIstDate } from "@h2india/core/time";
import { Alert, buttonClasses, cx, EmptyState, Icon, ProductCard, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import type { ReactNode } from "react";
import { publicWhere, showSample } from "@/cms/sample";
import { articlesMentioning } from "@/knowledge/data";
import { wrap } from "@/marketplace/parts";
import { dayMonthYear } from "@/news/format";
import { Crumbs } from "@/opportunities/parts";
import { getSession } from "@/server/auth";

// A company profile (Overview 481:8, Products 482:8; phones 483:8, 484:8; tabs 487:3188 to 489:20429), step 6.7. Tabs
// are ?tab= so each is a link. An unclaimed profile carries the Claim this profile banner (492:5615). Contact details
// show only to signed-in people (489:8, 489:20390).

type Params = Promise<{ slug: string }>;
const TABS = ["overview", "products", "projects", "certifications", "news", "events", "jobs", "contact"] as const;
type Tab = (typeof TABS)[number];
/** Badges with the date H2 India last checked each one (step 8.2: "the badge with today's date"). */
async function Badges({ organisationId }: { organisationId: string }) {
  const badges = await publicBadges(getDb(), organisationId);
  if (!badges.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {badges.map((b) => (
        <li key={b.kind} className="type-caption text-secondary">
          <span className="type-label-sm text-primary">{b.label}</span> · checked {formatIstDate(b.lastCheckedAt)}
        </li>
      ))}
    </ul>
  );
}

const load = (slug: string) => companyProfile(getDb(), slug, { includeSample: showSample() });

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return { title: "Not found · H2 India" };
  return {
    title: `${c.name} · Directory · H2 India`,
    description: c.summary ?? `${c.name}: ${[c.types[0], c.city, c.state].filter(Boolean).join(", ")}.`,
    alternates: { canonical: `/directory/companies/${c.slug}` },
  };
}
export const dynamic = "force-dynamic";

const initials = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ tab?: string }>;
}) {
  const c = await load((await params).slug);
  if (!c) notFound();
  const tab: Tab = (TABS as readonly string[]).includes((await searchParams).tab ?? "")
    ? ((await searchParams).tab as Tab)
    : "overview";
  const [session, products] = await Promise.all([
    getSession(),
    storefrontProducts(getDb(), c.organisationId, { includeSample: showSample() }),
  ]);
  const base = `/directory/companies/${c.slug}`;
  const certificates = [...new Map(products.flatMap((p) => p.certificates).map((x) => [x.name, x])).values()];
  const place = [c.city, c.state].filter(Boolean).join(", ");

  let body: ReactNode;
  if (tab === "overview") {
    body = (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="type-h3 text-primary">About {c.name}</h2>
            <p className="type-body text-body">{c.summary ?? `${c.name} hasn't added a description yet.`}</p>
          </section>
          {c.storefront.capabilities || c.storefront.industries?.length || c.storefront.locations?.length ? (
            <section className="flex flex-col gap-3">
              <h2 className="type-h3 text-primary">Capabilities</h2>
              {c.storefront.capabilities ? <p className="type-body text-body">{c.storefront.capabilities}</p> : null}
              {c.storefront.capacity || c.storefront.leadTime ? (
                <p className="type-body-sm text-secondary">
                  {[c.storefront.capacity, c.storefront.leadTime].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {c.storefront.industries?.length ? (
                <ul className="flex flex-wrap gap-2" aria-label="Industries served">
                  {c.storefront.industries.map((x) => (
                    <li key={x} className="rounded-pill border-[1.5px] border-control px-3 py-1 type-label-sm">
                      {x}
                    </li>
                  ))}
                </ul>
              ) : null}
              {c.storefront.locations?.length ? (
                <ul className="flex flex-col gap-1" aria-label="Locations">
                  {c.storefront.locations.map((l) => (
                    <li key={`${l.name}${l.city}`} className="type-body-sm text-body">
                      {[l.name, [l.city, l.state].filter(Boolean).join(", "), l.kind].filter(Boolean).join(" · ")}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
          <section className="flex flex-col gap-3 rounded-card border border-default p-5">
            <h2 className="type-h4 text-primary">At a glance</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["Makes or offers", c.categories.join(", ")],
                ["Founded", c.foundedYear ? String(c.foundedYear) : ""],
                ["Employees", c.employees ?? ""],
                ["Products on H2 India", String(products.length)],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="type-eyebrow text-secondary">{k}</dt>
                    <dd className="type-body text-primary">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>
        <aside
          className="flex flex-col gap-3 self-start rounded-card border border-default p-5"
          aria-label="What H2 India checked"
        >
          {c.verified ? <VerifiedBadge kind="supplier" /> : <p className="type-label text-primary">Not yet verified</p>}
          <p className="type-body-sm text-body">
            {c.verified
              ? "H2 India has checked this company's registration."
              : "H2 India hasn't completed its checks on this company yet."}
          </p>
          <Badges organisationId={c.organisationId} />
          <Link href="/verification" className="inline-flex items-center gap-1.5 type-label text-link">
            How we verify suppliers
            <Icon name="arrow-right" size={16} />
          </Link>
        </aside>
      </div>
    );
  } else if (tab === "products") {
    body = products.length ? (
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id} className="flex">
            <ProductCard
              className="w-full"
              name={p.name}
              href={p.href}
              eyebrow={p.eyebrow}
              supplier={c.name}
              supplierVerified={c.verified}
              chips={p.chips}
              leadTime={p.leadTime}
            />
          </li>
        ))}
      </ul>
    ) : (
      <Empty title="No products listed yet">{`${c.name} hasn't listed products on H2 India yet. You can still send a quote request.`}</Empty>
    );
  } else if (tab === "certifications") {
    body = certificates.length ? (
      <div
        role="region"
        tabIndex={0}
        aria-label="Certifications"
        className="relative overflow-x-auto rounded-card border border-default"
      >
        <table className="w-full min-w-150">
          <thead className="bg-subtle type-label-sm">
            <tr>
              {["Certificate", "Number", "Valid until", "Issuer"].map((x) => (
                <th key={x} scope="col" className="px-4 py-3 text-left font-normal">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {certificates.map((x) => (
              <tr key={x.name} className="border-t border-default type-body-sm">
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  {x.name}
                </th>
                <td className="px-4 py-3">{x.number ?? "—"}</td>
                <td className="px-4 py-3">{x.validUntil ?? "—"}</td>
                <td className="px-4 py-3">{x.issuer ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty title="No certificates listed yet">
        Certificates appear here as the company adds them to its products.
      </Empty>
    );
  } else if (tab === "news") {
    const news = await articlesMentioning([c.name], 6);
    body = news.length ? (
      <ul className="flex flex-col divide-y divide-default">
        {news.map((a) => (
          <li key={a.id} className="py-3">
            <Link href={`/news/${a.slug}`} className="type-label text-link hover:underline">
              {a.title}
            </Link>
            <p className="type-caption text-secondary">{a.publishedAt ? dayMonthYear(a.publishedAt) : ""}</p>
          </li>
        ))}
      </ul>
    ) : (
      <Empty title="No news yet">{`Stories that mention ${c.name} show here.`}</Empty>
    );
  } else if (tab === "jobs") {
    const p = await getPayload({ config });
    const jobs = await p.find({
      collection: "jobs",
      where: { and: [publicWhere(), { companySlug: { equals: c.slug } }] },
      limit: 20,
      depth: 0,
    });
    body = jobs.docs.length ? (
      <ul className="flex flex-col divide-y divide-default">
        {jobs.docs.map((j) => (
          <li key={j.id} className="py-3">
            <Link href={`/opportunities/jobs/${j.slug}`} className="type-label text-link hover:underline">
              {j.role}
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <Empty title="No open roles">{`${c.name} has no open roles on H2 India right now.`}</Empty>
    );
  } else if (tab === "contact") {
    body = session ? (
      <dl className="grid max-w-150 gap-4 rounded-card border border-default p-5 sm:grid-cols-2">
        {place ? (
          <div>
            <dt className="type-eyebrow text-secondary">Location</dt>
            <dd className="type-body">{place}</dd>
          </div>
        ) : null}
        {c.website ? (
          <div>
            <dt className="type-eyebrow text-secondary">Website</dt>
            <dd>
              <a href={c.website} target="_blank" rel="noopener noreferrer" className="type-body text-link underline">
                {c.website.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <Link href={`/rfq/new?supplier=${c.slug}`} className={buttonClasses({})}>
            Request a quote
          </Link>
        </div>
      </dl>
    ) : (
      <Empty
        title="Sign in to see contact details"
        action={
          <Link href={`/sign-in?next=${encodeURIComponent(`${base}?tab=contact`)}`} className={buttonClasses({})}>
            Sign in
          </Link>
        }
      >
        Contact details are shown to signed-in members so suppliers aren&apos;t sent spam.
      </Empty>
    );
  } else {
    body = (
      <Empty title={tab === "projects" ? "No projects listed yet" : "No upcoming events"}>
        {tab === "projects"
          ? "Projects show here once they're in the India Hydrogen Tracker."
          : "Events the company runs or attends show here."}
      </Empty>
    );
  }

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-6 py-8 pb-16")}>
        <Crumbs items={[{ label: "Directory", href: "/directory/companies" }, { label: c.name }]} />
        {!c.claimed ? (
          <Alert tone="info" title="Is this your company?">
            This profile was set up by H2 India from public information.{" "}
            <Link href={`${base}/claim`} className="type-label underline">
              Claim this profile
            </Link>{" "}
            to keep it up to date and reply to quote requests.
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-start gap-4">
          <span
            aria-hidden="true"
            className="flex size-20 items-center justify-center rounded-card border border-default bg-subtle type-h3"
          >
            {initials(c.name)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="type-h1 text-primary">{c.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {c.verified ? <VerifiedBadge kind="supplier" /> : null}
              {c.types.map((t) => (
                <span key={t} className="rounded-pill border-[1.5px] border-control px-2.5 py-0.5 type-label-sm">
                  {t}
                </span>
              ))}
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 type-caption text-secondary">
              {place ? <span>{place}</span> : null}
              {c.foundedYear ? <span>Founded {c.foundedYear}</span> : null}
              {c.employees ? <span>{c.employees} employees</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={
                session
                  ? `/member/follows?company=${c.slug}`
                  : `/sign-in?next=${encodeURIComponent(`/member/follows?company=${c.slug}`)}`
              }
              className={buttonClasses({ variant: "outline" })}
            >
              <Icon name="plus" size={16} />
              Follow
            </Link>
            <Link href={`${base}?tab=contact`} className={buttonClasses({ variant: "outline" })}>
              <Icon name="message-square" size={16} />
              Contact supplier
            </Link>
            <Link href={`/rfq/new?supplier=${c.slug}`} className={buttonClasses({})}>
              Request a quote
            </Link>
          </div>
        </div>
        <nav aria-label="Company sections" className="flex gap-5 overflow-x-auto border-b border-default">
          {TABS.map((t) => (
            <Link
              key={t}
              href={t === "overview" ? base : `${base}?tab=${t}`}
              aria-current={tab === t ? "page" : undefined}
              className={cx(
                "-mb-px border-b-2 py-3 type-label whitespace-nowrap capitalize",
                tab === t ? "border-inverse text-primary" : "border-transparent text-secondary",
              )}
            >
              {t}
              {t === "products" && products.length ? (
                <span className="ml-1.5 text-secondary">{products.length}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        {body}
      </div>
    </main>
  );
}

function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-default bg-subtle">
      <EmptyState title={title} action={action}>
        {children}
      </EmptyState>
    </div>
  );
}
