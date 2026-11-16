import { getDb, getSetting } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { SEARCH_BOOSTS, SEARCH_SYNONYMS, searchMissReport } from "@h2india/core/search";
import { formatIstDayMonth } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { BoostEditor, SynonymEditor } from "@/admin/content/SearchControls";
import { AdminShell, requireOperator } from "@/admin/shell";

// Search management (707:281), step 11.3: searches that found nothing in the last 30 days, synonyms and boosted
// results. Changes apply to the live search at once. Who searched is never stored.
export const metadata: Metadata = { title: "Search · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SearchManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; synonym?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("settings.view", "/admin/settings/search");
  const db = getDb();
  const [misses, synonyms, boosts] = await Promise.all([
    searchMissReport(db, actor),
    getSetting(db, SEARCH_SYNONYMS),
    getSetting(db, SEARCH_BOOSTS),
  ]);
  const tab = sp.tab === "synonyms" || sp.tab === "boosts" ? sp.tab : "misses";
  const canEdit = can(actor, "settings.edit");
  const today = new Date().toDateString();
  const TABS = [
    { key: "misses", label: "No-result searches", n: misses.length },
    { key: "synonyms", label: "Synonyms", n: synonyms.length },
    { key: "boosts", label: "Boosted results", n: boosts.length },
  ];
  return (
    <AdminShell userId={userId} current="/admin/settings" title="Settings">
      <div>
        <h1 className="type-h2">Search</h1>
        <p className="type-body-sm text-secondary">
          What people search for on H2 Economy, and the synonyms and boosted results that help them find it.
        </p>
      </div>
      <nav aria-label="Search management" className="flex gap-6 border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/settings/search?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 type-label",
              t.key === tab ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{t.n}</span>
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          {tab === "misses" ? (
            <>
              <h2 className="type-h4">Searches that found nothing · last 30 days</h2>
              <p className="type-caption text-secondary">
                Fix a spelling or naming gap with a synonym, or ask the content team for a page.
              </p>
              {misses.length ? (
                <div tabIndex={0} role="region" aria-label="No-result searches" className="relative overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr className="bg-subtle text-left type-caption text-secondary">
                        <th scope="col" className="px-3 py-2">
                          Search
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Searches
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Last
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Fix
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {misses.map((m) => (
                        <tr key={m.query} className="border-t border-default">
                          <td className="px-3 py-2 type-label">{m.query}</td>
                          <td className="px-3 py-2 type-body-sm">{m.searches}</td>
                          <td className="px-3 py-2 type-body-sm">
                            {new Date(m.last).toDateString() === today ? "Today" : formatIstDayMonth(new Date(m.last))}
                          </td>
                          <td className="px-3 py-2">
                            {canEdit ? (
                              <Link
                                href={`/admin/settings/search?tab=synonyms&synonym=${encodeURIComponent(m.query)}`}
                                className={buttonClasses({ variant: "outline", size: "sm" })}
                              >
                                Create synonym
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="Every search found something">
                  Searches with no results show here for 30 days.
                </EmptyState>
              )}
            </>
          ) : tab === "synonyms" ? (
            <>
              <h2 className="type-h4">Synonyms</h2>
              {canEdit ? (
                <SynonymEditor groups={synonyms} prefill={sp.synonym ? `${sp.synonym}, ` : ""} />
              ) : (
                <ul className="flex flex-col gap-2">
                  {synonyms.map((g) => (
                    <li key={g.join("|")} className="type-body-sm">
                      {g.join(" · ")}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <h2 className="type-h4">Boosted results</h2>
              {canEdit ? (
                <BoostEditor boosts={boosts} />
              ) : (
                <p className="type-body-sm">{boosts.length} boosted results.</p>
              )}
            </>
          )}
        </section>
        <aside className="flex flex-col gap-6 self-start">
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Recent synonyms</h2>
            {synonyms
              .slice(-4)
              .reverse()
              .map((g) => (
                <div key={g.join("|")} className="border-t border-default pt-2">
                  <p className="type-label">{g[0]}</p>
                  <p className="type-caption text-secondary">Also matches: {g.slice(1).join(" · ")}</p>
                </div>
              ))}
          </section>
          <section className="flex flex-col gap-2 rounded-card border border-default bg-page p-5">
            <h2 className="type-h4">Boosted results</h2>
            {boosts.length ? (
              boosts.slice(0, 4).map((b) => (
                <div key={`${b.query}${b.documentId}`} className="border-t border-default pt-2">
                  <p className="type-caption text-secondary">Shown first for &quot;{b.query}&quot;</p>
                  <p className="type-label">{b.label || b.documentId}</p>
                </div>
              ))
            ) : (
              <p className="type-caption text-secondary">None yet.</p>
            )}
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
