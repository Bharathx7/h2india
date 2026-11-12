import { buttonClasses, cx } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs } from "@/opportunities/parts";
import { trackerMethodology } from "@/tracker/data";
import { StageBadge, wrap } from "@/tracker/parts";

// How the tracker works (740:469, step 5.6): the editable methodology (statuses, trusted sources, units, update
// rhythm) and how to report a correction.

export const metadata: Metadata = {
  title: "How the tracker works · India Hydrogen Tracker · H2 India",
  description: "What each status means, which sources we trust, how often we update and how to report a correction.",
  alternates: { canonical: "/tracker/methodology" },
};
export const dynamic = "force-dynamic";

export default async function MethodologyPage() {
  const m = await trackerMethodology();
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs
          items={[
            { label: "Knowledge", href: "/knowledge" },
            { label: "India Hydrogen Tracker", href: "/tracker" },
            { label: "Methodology" },
          ]}
        />
        <h1 className="mt-2 type-h1 text-primary">How the tracker works</h1>
        <p className="type-body text-body">
          What each status means, which sources we trust, how often we update and how to report a correction.
        </p>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 max-w-200 flex-1 flex-col gap-6">
          <section aria-labelledby="statuses" className="flex flex-col gap-3 rounded-card border border-default p-5">
            <div>
              <h2 id="statuses" className="type-h4 text-primary">
                What each status means
              </h2>
              <p className="type-caption text-secondary">
                A record moves forward only when we have the evidence in the right-hand column.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-150 text-left">
                <thead className="bg-subtle type-label-sm text-secondary">
                  <tr>
                    {["Status", "Meaning", "Evidence we need"].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2.5 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="type-body-sm text-primary">
                  {(m.statusMeanings ?? []).map((s) => (
                    <tr key={s.id ?? s.status} className="border-t border-default">
                      <td className="px-3 py-3">
                        <StageBadge stage={s.status} />
                      </td>
                      <td className="px-3 py-3">{s.meaning}</td>
                      <td className="px-3 py-3">{s.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section aria-labelledby="sources" className="flex flex-col gap-3 rounded-card border border-default p-5">
            <h2 id="sources" className="type-h4 text-primary">
              Which sources we trust, in order
            </h2>
            <ol className="flex flex-col gap-3">
              {(m.sources ?? []).map((s, i) => (
                <li key={s.id ?? s.text} className="flex items-center gap-3 type-body-sm text-body">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-subtle type-label-sm text-primary">
                    {i + 1}
                  </span>
                  {s.text}
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="units" className="flex flex-col gap-2 rounded-card border border-default p-5">
            <h2 id="units" className="type-h4 text-primary">
              Units and conversions
            </h2>
            {(m.units ?? []).map((u) => (
              <p key={u.id ?? u.text} className="type-body-sm text-body">
                {u.text}
              </p>
            ))}
          </section>
        </div>
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <section aria-labelledby="often" className="flex flex-col gap-2 rounded-card border border-default p-5">
            <h2 id="often" className="type-h4 text-primary">
              How often we update
            </h2>
            <p className="type-body-sm text-body">{m.updateNote}</p>
          </section>
          <section aria-labelledby="wrong" className="flex flex-col gap-3 rounded-card bg-mint p-5">
            <h2 id="wrong" className="type-h4 text-primary">
              Spotted something wrong?
            </h2>
            <p className="type-body-sm text-body">
              Tell us the record, what&apos;s wrong and your source. We reply within 1 working day.
            </p>
            <Link href="/contact?about=tracker" className={cx(buttonClasses({ size: "sm" }), "self-start")}>
              Report a correction
            </Link>
            <Link href="/corrections" className="type-label-sm text-link hover:underline">
              Corrections policy
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
