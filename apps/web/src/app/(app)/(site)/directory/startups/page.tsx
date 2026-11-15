import { filterDirectory, parseDirectory, typeLabel } from "@h2india/core/directory/rules";
import { buttonClasses, cx, EmptyState, OrgCard, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { companies } from "@/directory/data";
import { forcedState } from "@/lib/dev-state";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";

// Start-up spotlight (497:7060; phones 499:515), step 6.6: company profiles typed Start-up, newest first. The weekly
// featured story joins when editors start the series (A135); "Apply to be featured" goes to Contact.
export const metadata: Metadata = {
  title: "Hydrogen start-ups in India · H2 India",
  description: "Start-ups working on hydrogen in India, from membranes to mobility.",
  alternates: { canonical: "/directory/startups" },
};
export const dynamic = "force-dynamic";

export default async function StartupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const forced = forcedState(typeof params.ui === "string" ? params.ui : undefined);
  const result = filterDirectory(await companies(), parseDirectory({ ...params, type: "startup", ui: undefined }));
  const link = ({ href, className, children }: { href: string; className: string; children: React.ReactNode }) => (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
  return (
    <main id="main" className={cx(wrap, "flex flex-col gap-6 py-8 pb-16 [&_:is(h1,h2,h3)]:text-wrap")}>
      <Crumbs items={[{ label: "Directory", href: "/directory/companies" }, { label: "Start-ups" }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="type-h1 text-primary">Hydrogen start-ups in India</h1>
          <p className="type-body text-body">
            {result.total} start-ups working on hydrogen, from membranes to mobility.
          </p>
        </div>
        <Link href="/contact?topic=startup-feature" className={buttonClasses({ variant: "outline" })}>
          Apply to be featured
        </Link>
      </div>
      <LiveSection
        label="Start-ups"
        state={forced ?? (result.total ? "ready" : "empty")}
        skeleton={<Skeleton kind="card" />}
        empty={
          <div className="rounded-card border border-default bg-subtle">
            <EmptyState title="Start-ups are joining">Start-ups show here once they list their company.</EmptyState>
          </div>
        }
      >
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {result.items.map((e) => (
            <li key={e.id} className="flex">
              <OrgCard
                className="w-full"
                name={e.name}
                type={typeLabel(e)}
                place={[e.city, e.state].filter(Boolean).join(", ")}
                initials={e.initials}
                gstVerified={e.verified}
                summary={e.categories.join(", ") || e.summary}
                href={e.href}
                quoteHref="/rfq/new"
                renderLink={link}
              />
            </li>
          ))}
        </ul>
      </LiveSection>
      <section className="flex flex-wrap items-center gap-4 rounded-card bg-subtle p-6">
        <div className="min-w-0 flex-1">
          <h2 className="type-h4 text-primary">Building something in hydrogen?</h2>
          <p className="type-body-sm text-body">Start-ups can apply to be featured. Being featured is free.</p>
        </div>
        <Link href="/contact?topic=startup-feature" className={buttonClasses({})}>
          Apply to be featured
        </Link>
      </section>
    </main>
  );
}
