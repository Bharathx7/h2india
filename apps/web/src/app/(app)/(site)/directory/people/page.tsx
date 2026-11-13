import { buttonClasses, cx, EmptyState, Icon, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { PERSON_AFFILIATION, PERSON_AVAILABLE, PERSON_EXPERTISE } from "@/cms/directory/collections";
import { LiveSection } from "@/components/LiveSection";
import { people } from "@/directory/data";
import { forcedState } from "@/lib/dev-state";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";

// People in India's hydrogen industry (756:12213), step 6.6. Only people whose consent to be listed is recorded (M24
// safe default). Contact goes through H2 India; emails are never shown. Filters are a plain form in the address.
export const metadata: Metadata = {
  title: "People in India's hydrogen industry · H2 India",
  description: "Experts, researchers and professionals who chose to list themselves. Contact goes through H2 India.",
  alternates: { canonical: "/directory/people" },
};
export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

const initials = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

export default async function PeoplePage({ searchParams }: { searchParams: Search }) {
  const s = await searchParams;
  const forced = forcedState(all(s.ui)[0]);
  const q = (all(s.q)[0] ?? "").trim().toLowerCase();
  const expertise = all(s.expertise);
  const affiliation = all(s.affiliation);
  const available = all(s.available);
  const state = all(s.state)[0] ?? "";
  const everyone = await people();
  const shown = everyone.filter(
    (p) =>
      (!q || [p.name, p.role, p.organisation, ...(p.topics ?? [])].join(" ").toLowerCase().includes(q)) &&
      (!expertise.length || expertise.some((e) => (p.expertise ?? []).includes(e as never))) &&
      (!affiliation.length || affiliation.includes(p.affiliation)) &&
      (!available.length || available.some((a) => (p.availableFor ?? []).includes(a as never))) &&
      (!state || p.state === state),
  );
  const states = [...new Set(everyone.map((p) => p.state).filter((x): x is string => Boolean(x)))].sort();
  const box = (name: string, value: string, chosen: string[]) => (
    <label key={value} className="flex items-center gap-2.5 type-body text-primary">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={chosen.includes(value)}
        className="size-5 accent-ink-900"
      />
      {value}
    </label>
  );
  const group = (title: string, children: React.ReactNode) => (
    <fieldset className="flex flex-col gap-3 border-b border-default py-4">
      <legend className="mb-3 type-label text-primary">{title}</legend>
      {children}
    </fieldset>
  );

  return (
    <main id="main" className={cx(wrap, "flex flex-col gap-6 py-8 pb-16 [&_:is(h1,h2,h3)]:text-wrap")}>
      <Crumbs items={[{ label: "Directory", href: "/directory/companies" }, { label: "People" }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="type-h1 text-primary">People in India&apos;s hydrogen industry</h1>
          <p className="type-body text-body">
            Experts, researchers and professionals who chose to list themselves. Contact goes through H2 India; we never
            share emails.
          </p>
        </div>
        <Link href="/sign-in?next=/member/profile" className={buttonClasses({ variant: "outline" })}>
          Create your profile
        </Link>
      </div>
      <form method="get" className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="flex flex-col">
          {group(
            "Expertise",
            PERSON_EXPERTISE.map((e) => box("expertise", e, expertise)),
          )}
          {group(
            "Affiliation",
            PERSON_AFFILIATION.map((e) => box("affiliation", e, affiliation)),
          )}
          {group(
            "State",
            <select
              name="state"
              defaultValue={state}
              aria-label="State"
              className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
            >
              <option value="">Any state</option>
              {states.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>,
          )}
          {group(
            "Available for",
            PERSON_AVAILABLE.map((e) => box("available", e, available)),
          )}
          <button type="submit" className={cx(buttonClasses({ variant: "secondary" }), "mt-4")}>
            Apply filters
          </button>
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-11 min-w-60 flex-1 items-center gap-2 rounded-control border-[1.5px] border-control bg-page px-3">
              <Icon name="search" size={18} className="text-icon-secondary" />
              <span className="sr-only">Search people</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search names, roles or expertise"
                className="min-w-0 flex-1 bg-transparent type-body outline-none"
              />
            </label>
            <p className="type-caption text-secondary">
              {shown.length} of {everyone.length} people
            </p>
          </div>
          <LiveSection
            label="People"
            state={forced ?? (shown.length ? "ready" : "empty")}
            skeleton={<Skeleton kind="card" />}
            empty={
              <div className="rounded-card border border-default bg-subtle">
                <EmptyState
                  kind={everyone.length ? "no-results" : "first-use"}
                  title={everyone.length ? "No one matches" : "People are joining"}
                >
                  {everyone.length
                    ? "Try fewer filters."
                    : "Experts and professionals appear here once they agree to be listed."}
                </EmptyState>
              </div>
            }
          >
            <ul className="grid gap-4 md:grid-cols-2">
              {shown.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 rounded-card border border-default p-4">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary"
                    >
                      {initials(p.name)}
                    </span>
                    <span className="flex flex-col">
                      <Link href={`/directory/people/${p.slug}`} className="type-label text-link hover:underline">
                        {p.name}
                      </Link>
                      <span className="type-caption text-secondary">
                        {[p.role, p.organisation, p.state].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {(p.topics ?? []).map((t) => (
                      <li key={t} className="rounded-pill bg-subtle px-2 py-0.5 type-caption text-primary">
                        {t}
                      </li>
                    ))}
                    {(p.availableFor ?? []).map((a) => (
                      <li key={a}>
                        <StatusBadge status={`Available for ${a.toLowerCase()}`} tone="success" />
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/contact?person=${p.slug}`}
                    className={cx(buttonClasses({ variant: "outline", size: "sm" }), "self-start")}
                  >
                    <Icon name="message-square" size={16} />
                    Contact via H2 India
                  </Link>
                </li>
              ))}
            </ul>
          </LiveSection>
        </div>
      </form>
    </main>
  );
}
