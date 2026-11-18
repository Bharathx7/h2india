import { Alert, cx } from "@h2india/ui";
import Link from "next/link";
import { LEGAL_PAGES } from "@/cms/trust/collections";
import { slugify } from "@/cms/slug";
import { legalPage } from "./data";
import { PrintButton } from "./PrintButton";
import { main, wrap } from "./parts";
import { istDay } from "./views";

// A legal page (Terms 66:5004, Privacy 521:305, Cookies 521:459, Editorial 521:603, Corrections 521:754,
// Sponsored 521:898): Contents, "Last updated · Version", Print or save as PDF, numbered sections and the version
// history. The words are the lawyers' (M2); until a version is published the page says the text is being finalised.

export async function LegalDocument({ slug, after }: { slug: string; after?: React.ReactNode }) {
  const doc = await legalPage(slug);
  const meta = LEGAL_PAGES.find((p) => p.value === slug);
  const title = doc?.title ?? meta?.label ?? "Policy";
  const sections = doc?.sections ?? [];
  const history = doc?.history ?? [];
  const contents = [
    ...sections.map((s, i) => ({ id: slugify(s.heading), label: `${String(i + 1)}. ${s.heading}` })),
    ...(history.length ? [{ id: "version-history", label: "Version history" }] : []),
  ];
  return (
    <main id="main" className={main}>
      <div className={cx(wrap, "flex flex-col gap-8 pt-8 lg:flex-row lg:gap-16")}>
        {contents.length ? (
          <nav aria-labelledby="contents" className="hidden shrink-0 lg:block lg:w-56 print:hidden">
            <div className="sticky top-24 flex flex-col gap-2">
              <p id="contents" className="type-label-sm text-secondary">
                Contents
              </p>
              {contents.map((c) => (
                <a key={c.id} href={`#${c.id}`} className="type-label-sm text-primary hover:text-link">
                  {c.label}
                </a>
              ))}
            </div>
          </nav>
        ) : null}
        <article className="flex min-w-0 max-w-180 flex-1 flex-col gap-4">
          <h1 className="type-h1 text-primary">{title}</h1>
          {doc ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-secondary">
              Last updated {istDay(doc.effectiveOn)} · Version {doc.version}
              <PrintButton />
            </p>
          ) : (
            <Alert tone="info" title="This policy is being finalised">
              We&apos;ll publish it here, with its version and date, before it applies. Questions meanwhile?{" "}
              <Link href="/contact" className="underline">
                Contact us
              </Link>
              .
            </Alert>
          )}
          {sections.map((s, i) => (
            <section key={s.id ?? s.heading} aria-labelledby={slugify(s.heading)} className="flex flex-col gap-2">
              <h2 id={slugify(s.heading)} className="scroll-mt-24 type-h3 text-primary">
                {i + 1}. {s.heading}
              </h2>
              {(s.body ?? "")
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((para) => (
                  <p key={para.slice(0, 40)} className="type-body text-body">
                    {para}
                  </p>
                ))}
            </section>
          ))}
          {after}
          {history.length ? (
            <section aria-labelledby="version-history" className="flex flex-col gap-3 pt-2">
              <h2 id="version-history" className="scroll-mt-24 type-h3 text-primary">
                Version history
              </h2>
              <div
                tabIndex={0}
                role="region"
                aria-label="Version history table"
                className="overflow-x-auto rounded-card border border-default"
              >
                <table className="w-full text-left">
                  <thead className="bg-subtle type-label-sm text-secondary">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">
                        Version
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Date
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        What changed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default type-body-sm text-primary">
                    {history.map((h) => (
                      <tr key={h.version}>
                        <td className="px-4 py-3">{h.version}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{istDay(h.date)}</td>
                        <td className="px-4 py-3">{h.changed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </article>
      </div>
    </main>
  );
}
