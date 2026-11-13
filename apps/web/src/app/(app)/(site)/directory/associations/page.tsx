import { cx, EmptyState, Icon, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ASSOCIATION_KINDS } from "@/cms/directory/collections";
import { LiveSection } from "@/components/LiveSection";
import { associations } from "@/directory/data";
import { forcedState } from "@/lib/dev-state";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";

// Associations and bodies (498:8; phones 499:1430), step 6.6: kept by editors in the CMS.
export const metadata: Metadata = {
  title: "Associations and bodies · H2 India",
  description: "Industry bodies, alliances, chambers and government bodies working on hydrogen in India.",
  alternates: { canonical: "/directory/associations" },
};
export const dynamic = "force-dynamic";

export default async function AssociationsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; state?: string }>;
}) {
  const s = await searchParams;
  const forced = forcedState(s.state);
  const list = await associations();
  const shown = s.kind ? list.filter((a) => a.kind === s.kind) : list;
  const initials = (n: string) =>
    n
      .replace(/\(.*\)/, "")
      .split(/\s+/)
      .filter((w) => /^[A-Z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join("");
  const tab = (key: string, label: string, count: number) => (
    <Link
      key={key}
      href={key ? `/directory/associations?kind=${key}` : "/directory/associations"}
      aria-current={(s.kind ?? "") === key ? "page" : undefined}
      className={cx(
        "rounded-pill border-[1.5px] px-3 py-1 type-label",
        (s.kind ?? "") === key ? "border-transparent bg-inverse text-inverse" : "border-control text-primary",
      )}
    >
      {label} · {count}
    </Link>
  );
  return (
    <main id="main" className={cx(wrap, "flex flex-col gap-6 py-8 pb-16 [&_:is(h1,h2,h3)]:text-wrap")}>
      <Crumbs items={[{ label: "Directory", href: "/directory/companies" }, { label: "Associations and bodies" }]} />
      <h1 className="type-h1 text-primary">Associations and bodies</h1>
      <p className="type-body text-body">
        Industry bodies, alliances, chambers and government bodies working on hydrogen in India. Contact them through
        their own websites.
      </p>
      <nav aria-label="Kinds" className="flex flex-wrap gap-2">
        {tab("", "All", list.length)}
        {ASSOCIATION_KINDS.map((k) => tab(k.value, k.plural, list.filter((a) => a.kind === k.value).length))}
      </nav>
      <LiveSection
        label="Associations"
        state={forced ?? (shown.length ? "ready" : "empty")}
        skeleton={<Skeleton kind="card" />}
        empty={
          <div className="rounded-card border border-default bg-subtle">
            <EmptyState title="No associations listed yet">
              Our editors are adding the bodies working on hydrogen in India.
            </EmptyState>
          </div>
        }
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 rounded-card border border-default p-5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm"
                >
                  {initials(a.name)}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="type-eyebrow text-secondary">
                    {[ASSOCIATION_KINDS.find((k) => k.value === a.kind)?.label, a.city].filter(Boolean).join(" · ")}
                  </span>
                  <h2 className="type-label-lg text-primary">{a.name}</h2>
                </span>
              </div>
              <p className="type-body-sm text-body">{a.summary}</p>
              {a.memberCompanies ? (
                <p className="flex items-center gap-1.5 type-caption text-secondary">
                  <Icon name="users" size={14} />
                  {a.memberCompanies} member companies
                </p>
              ) : null}
              <a
                href={a.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center gap-1.5 self-end border-t border-default pt-3 type-label text-primary"
              >
                <Icon name="external-link" size={16} />
                Website<span className="sr-only"> of {a.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </LiveSection>
    </main>
  );
}
