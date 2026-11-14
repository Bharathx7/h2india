import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { supplierAnalytics } from "@h2india/core/supplier";
import { formatIstDate } from "@h2india/core/time";
import { buttonClasses, EmptyState, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Analytics · last 30 days (814:12112), step 8.8, from H2 India's own records. RFQ, quote win rate and response time
// tiles arrive with RFQs (Stage 9). Open to every supplier until plans are decided (M16).
export const metadata: Metadata = { title: "Analytics · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const n = (x: number) => new Intl.NumberFormat("en-IN").format(x);

function Tile({ value, label, sub, tone }: { value: string; label: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-default bg-page p-5">
      <p className="type-h1 text-primary">{value}</p>
      <p className="type-body-sm text-body">{label}</p>
      {sub ? (
        <p className={tone === "down" ? "type-caption text-warning" : "type-caption text-success"}>{sub}</p>
      ) : null}
    </div>
  );
}

export default async function AnalyticsPage() {
  const page = await requireSupplier("/supplier/analytics");
  const a = await supplierAnalytics(getDb(), scopeFor(page.actor), page.supplier.organisationId);
  const change = (x: number | null) =>
    x === null ? undefined : `${x >= 0 ? "+" : ""}${String(x)}% vs previous 30 days`;
  return (
    <SupplierShell page={page} current="/supplier/analytics" title="Analytics">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Analytics</h1>
          <p className="type-body-sm text-secondary">
            How buyers find and respond to {page.supplier.tradeName} on H2 India. Compared with the previous 30 days.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-control border-[1.5px] border-control px-3 py-2 type-body-sm">
            Last 30 days, to {formatIstDate(new Date(`${a.to}T12:00:00+05:30`))}
          </span>
          <a href="/supplier/analytics/export" className={buttonClasses({ variant: "outline" })}>
            <Icon name="download" size={16} />
            Export CSV
          </a>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          value={n(a.views)}
          label="Views of your storefront and products"
          sub={change(a.viewsChange)}
          tone={a.viewsChange !== null && a.viewsChange < 0 ? "down" : "up"}
        />
        <Tile
          value={n(a.enquiries)}
          label="Enquiries and questions"
          sub={`${a.enquiriesChange >= 0 ? "+" : ""}${String(a.enquiriesChange)}`}
          tone={a.enquiriesChange < 0 ? "down" : "up"}
        />
        <Tile value={n(a.saves)} label="Saved by buyers" />
        <Tile value={n(a.compared)} label="Added to a comparison" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Top products</h2>
          {a.top.length ? (
            <div tabIndex={0} role="region" aria-label="Top products" className="relative overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-default text-left type-caption text-secondary">
                    <th scope="col" className="py-2">
                      Product
                    </th>
                    <th scope="col" className="py-2">
                      Views
                    </th>
                    <th scope="col" className="py-2">
                      Enquiries
                    </th>
                    <th scope="col" className="py-2">
                      Saves
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {a.top.map((p) => (
                    <tr key={p.id} className="border-b border-default last:border-0">
                      <th scope="row" className="py-3 text-left type-body-sm font-normal">
                        {p.name}
                      </th>
                      <td className="py-3 type-spec">{n(p.views)}</td>
                      <td className="py-3 type-spec">{n(p.enquiries)}</td>
                      <td className="py-3 type-spec">{n(p.saves)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No views yet">
              Views, saves and questions show here as buyers find your listings.
            </EmptyState>
          )}
          <p className="type-caption text-secondary">
            Storefront views not linked to a product: {n(a.storefrontViews)}.
          </p>
        </section>
        <section className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Where buyers are</h2>
          <p className="type-caption text-secondary">Share of views by buyer&apos;s GST state</p>
          {a.states.length ? (
            <ul className="flex flex-col gap-3">
              {a.states.map((s) => (
                <li key={s.state} className="flex flex-col gap-1">
                  <span className="flex justify-between type-body-sm">
                    <span>{s.state}</span>
                    <span>{s.share}%</span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-pill bg-subtle">
                    <span
                      className={
                        s.state === "Other states"
                          ? "block h-full rounded-pill bg-ink-500"
                          : "block h-full rounded-pill bg-accent"
                      }
                      style={{ width: `${String(s.share)}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-body-sm text-body">No views yet.</p>
          )}
        </section>
      </div>
    </SupplierShell>
  );
}
