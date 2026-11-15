import { Breadcrumbs, buttonClasses, cx, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { wrap } from "@/news/parts";
import { allHubs, stateLabel } from "@/schemes/data";
import type { TrackerHub } from "@/payload-types";

// Green hydrogen hubs and hydrogen valleys (751:8302, step 5.4). The India map arrives with the map component in step
// 6.6; until then its place shows what it will hold, as drawn. Choosing a valley opens its details beside the map.

export const metadata: Metadata = {
  title: "Green hydrogen hubs and hydrogen valleys · H2 India",
  description: "Ports recognised as green hydrogen hubs, and the Hydrogen Valley Innovation Clusters.",
  alternates: { canonical: "/states/hubs" },
};
export const dynamic = "force-dynamic";

function Detail({ hub }: { hub: TrackerHub }) {
  const rows = [
    { label: "Status", value: hub.status },
    { label: "Lead organisation", value: hub.lead },
    { label: "Region", value: hub.location },
    { label: "Focus areas", value: hub.focus ?? hub.description },
  ].filter((r) => r.value);
  return (
    <section
      aria-labelledby="hub-detail"
      className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-default pb-3">
        <h2 id="hub-detail" className="type-h4 text-primary">
          {hub.name}
        </h2>
        <Link
          href="/states/hubs"
          scroll={false}
          aria-label={`Close ${hub.name}`}
          className="flex size-8 items-center justify-center rounded-pill border border-control text-icon-primary hover:border-focus"
        >
          <Icon name="x" size={16} />
        </Link>
      </div>
      <dl className="flex flex-col">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5 border-b border-default py-3">
            <dt className="type-caption text-secondary">{r.label}</dt>
            <dd className="type-body-sm text-primary">{r.value}</dd>
          </div>
        ))}
      </dl>
      {hub.state ? (
        <Link
          href={`/states/${hub.state}`}
          className={cx(buttonClasses({ variant: "outline", size: "sm" }), "self-start")}
        >
          Open {stateLabel(hub.state)} hub
        </Link>
      ) : null}
    </section>
  );
}

export default async function HubsPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const { h } = await searchParams;
  const hubs = await allHubs();
  const ports = hubs.filter((x) => x.kind === "Hub");
  const valleys = hubs.filter((x) => x.kind === "Valley");
  const selected = hubs.find((x) => x.slug === h) ?? null;
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "States", href: "/states/compare" },
            { label: "Hubs and valleys" },
          ]}
          renderLink={(c, className) => (
            <Link href={c.href} className={className}>
              {c.label}
            </Link>
          )}
        />
        <h1 className="mt-2 type-h1 text-primary">Green hydrogen hubs and hydrogen valleys</h1>
        <p className="max-w-180 type-body text-body">
          {ports.length} ports recognised as green hydrogen hubs, and {valleys.length} Hydrogen Valley Innovation
          Clusters under the National Green Hydrogen Mission.
        </p>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 py-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div
            role="img"
            aria-label={`India map with ${String(ports.length)} hub pins and ${String(valleys.length)} valley pins. The interactive map comes later; every place is listed below.`}
            className="flex aspect-[16/9] flex-col items-center justify-center gap-3 rounded-card bg-subtle"
          >
            <Icon name="map-pin" size={24} className="text-icon-secondary" />
            <p className="type-caption text-secondary">
              India map · {ports.length} hub pins (ports) and {valleys.length} valley pins
            </p>
            <p className="flex items-center gap-3 type-caption text-primary">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-pill bg-ink-500" /> Hub
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-tint px-2 py-0.5">
                <Icon name="check-circle" size={14} /> Valley
              </span>
            </p>
          </div>

          {ports.length ? (
            <section
              aria-labelledby="hubs"
              className="flex flex-col gap-4 rounded-card border border-default bg-page p-5"
            >
              <div className="flex flex-col gap-1">
                <h2 id="hubs" className="type-h4 text-primary">
                  Green hydrogen hubs
                </h2>
                <p className="type-caption text-secondary">Ports recognised for shared hydrogen infrastructure.</p>
              </div>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {ports.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2 rounded-card border border-default p-3">
                    <span className="inline-flex items-center gap-1.5 self-start rounded-pill bg-subtle px-2 py-0.5 type-label-sm text-body">
                      <span aria-hidden="true" className="size-1.5 rounded-pill bg-ink-500" />
                      Recognised hub
                    </span>
                    <Link
                      href={`/states/hubs?h=${p.slug}`}
                      scroll={false}
                      className="type-label text-link hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="type-caption text-secondary">{[p.location, p.lead].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {valleys.length ? (
            <section
              aria-labelledby="valleys"
              className="flex flex-col gap-4 rounded-card border border-default bg-page p-5"
            >
              <div className="flex flex-col gap-1">
                <h2 id="valleys" className="type-h4 text-primary">
                  Hydrogen Valley Innovation Clusters
                </h2>
                <p className="type-caption text-secondary">
                  Regional clusters that demonstrate the whole value chain in one place.
                </p>
              </div>
              <ul className="flex flex-col gap-1">
                {valleys.map((v) => {
                  const on = selected?.id === v.id;
                  return (
                    <li key={v.id}>
                      <Link
                        href={on ? "/states/hubs" : `/states/hubs?h=${v.slug}`}
                        scroll={false}
                        aria-current={on ? "true" : undefined}
                        className={cx(
                          "flex items-center gap-3 rounded-control px-3 py-3",
                          on ? "bg-mint" : "hover:bg-subtle",
                        )}
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="type-label text-primary">{v.name}</span>
                          <span className="type-caption text-secondary">
                            {[v.lead ? `Led by ${v.lead}` : null, v.focus].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <Icon name="chevron-right" size={18} className="text-icon-primary" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
        {selected ? (
          <aside className="lg:w-96 lg:shrink-0">
            <Detail hub={selected} />
          </aside>
        ) : null}
      </div>
    </main>
  );
}
