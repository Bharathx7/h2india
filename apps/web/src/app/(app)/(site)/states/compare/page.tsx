import { Breadcrumbs, buttonClasses, cx, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { STATE_OPTIONS } from "@/cms/records/common";
import { wrap } from "@/news/parts";
import { compareStates, MAX_STATES } from "@/schemes/compare";
import { policyStates } from "@/schemes/data";
import { StateTabs } from "@/schemes/StateTabs";
import { AddState } from "@/schemes/AddState";

// Compare state hydrogen policies (751:7856, step 5.4). The states are in the address (?s=maharashtra&s=gujarat), so a
// comparison can be shared; "Download CSV" gives the same table.

export const metadata: Metadata = {
  title: "Compare state hydrogen policies · H2 Economy",
  description: "Up to four states' hydrogen policies side by side: incentives, nodal agencies, projects and tenders.",
  alternates: { canonical: "/states/compare" },
};
export const dynamic = "force-dynamic";

const known = (v: string) => STATE_OPTIONS.some((o) => o.value === v && v !== "all-india");

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ s?: string | string[] }> }) {
  const raw = (await searchParams).s;
  const asked = [...new Set((Array.isArray(raw) ? raw : raw ? [raw] : []).filter(known))].slice(0, MAX_STATES);
  const available = await policyStates();
  const chosen = asked.length ? asked : available.slice(0, MAX_STATES).map((s) => s.value);
  const { states, rows } = await compareStates(chosen);
  const href = (list: string[]) => `/states/compare?${list.map((v) => `s=${v}`).join("&")}`;
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-4 pt-6 md:pt-8")}>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "States", href: "/states/compare" },
            { label: "Compare states" },
          ]}
          renderLink={(c, className) => (
            <Link href={c.href} className={className}>
              {c.label}
            </Link>
          )}
        />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="type-h1 text-primary">Compare state hydrogen policies</h1>
            <p className="type-body text-body">
              Pick up to {MAX_STATES} states. Summaries are ours; always read each policy before relying on it.
            </p>
          </div>
          {states.length ? (
            <a
              href={`/states/compare/csv?${chosen.map((v) => `s=${v}`).join("&")}`}
              className={buttonClasses({ variant: "outline" })}
            >
              <Icon name="download" size={18} />
              Download CSV
            </a>
          ) : null}
        </div>
        <StateTabs active="compare" state={chosen[0]} />
      </div>
      <div className={cx(wrap, "flex flex-col gap-4 py-6")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-label-sm text-primary">
            Comparing {states.length} of {MAX_STATES}:
          </span>
          {states.map((s) => (
            <Link
              key={s.value}
              href={href(chosen.filter((v) => v !== s.value)) || "/states/compare"}
              className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-inverse px-3 type-label text-inverse"
            >
              <Icon name="x" size={14} />
              {s.name}
              <span className="sr-only">: remove from the comparison</span>
            </Link>
          ))}
          {states.length < MAX_STATES ? (
            <AddState options={available.filter((a) => !chosen.includes(a.value))} chosen={chosen} />
          ) : null}
        </div>
        {states.length ? (
          <div className="relative overflow-x-auto rounded-card border border-default">
            <table className="w-full min-w-200 text-left">
              <thead className="sticky top-0 bg-subtle">
                <tr>
                  <th scope="col" className="w-44 px-4 py-3 type-label-sm text-secondary">
                    <span className="sr-only">Row</span>
                  </th>
                  {states.map((s) => (
                    <th key={s.value} scope="col" className="px-4 py-3 type-h4 text-primary">
                      <Link href={`/states/${s.value}`} className="hover:underline">
                        {s.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="type-body-sm">
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-default">
                    <th scope="row" className="bg-subtle px-4 py-3 type-label text-primary">
                      {r.label}
                    </th>
                    {r.values.map((v, i) => (
                      <td
                        key={`${r.label}-${String(i)}`}
                        className={cx("px-4 py-3", v === "Not specified" ? "text-secondary" : "text-primary")}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="type-body-sm text-secondary">Add a state to start comparing.</p>
        )}
        <p className="type-caption text-secondary">
          &quot;Not specified&quot; means the policy text doesn&apos;t cover it. Project and tender counts come from the
          India Hydrogen Tracker and the tenders listing.
        </p>
      </div>
    </main>
  );
}
