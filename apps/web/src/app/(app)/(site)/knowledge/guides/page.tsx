import { cx, Icon, Pagination } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { allGuides } from "@/knowledge/data";
import { LIST_PER_PAGE, pageSlice, pagingQuery } from "@/lib/paging";
import { Crumbs, wrap } from "@/opportunities/parts";

// Buyer's guides (step 5.6): every guide written for a product category, as on the knowledge home (470:1391). No list
// frame is drawn; this is the knowledge home's guide tiles at full length.

export const metadata: Metadata = {
  title: "Buyer's guides · H2 Economy",
  description: "How to specify and buy hydrogen equipment in India, category by category.",
  alternates: { canonical: "/knowledge/guides" },
};
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

export default async function GuidesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const guides = (await allGuides()).filter((g) => (g.productCategories ?? []).length > 0);
  const shown = pageSlice(guides, params.page);
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Knowledge", href: "/knowledge" }, { label: "Buyer's guides" }]} />
        <h1 className="mt-2 type-h1 text-primary">Buyer&apos;s guides</h1>
        <p className="type-body text-body">
          How each kind of equipment works, which specs matter, the Indian approvals that apply and what to ask
          suppliers.
        </p>
      </div>
      <div className={cx(wrap, "pb-16 pt-6")}>
        {guides.length ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.items.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/knowledge/guides/${g.slug}`}
                  className="flex h-full flex-col gap-2 rounded-card border border-default p-5 hover:border-focus"
                >
                  <span className="type-eyebrow text-secondary">
                    BUYER&apos;S GUIDE · {(g.productCategories ?? [])[0]?.toUpperCase()}
                  </span>
                  <span className="type-h4 text-primary">{g.title}</span>
                  <span className="type-body-sm text-body">{g.summary}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 type-label-sm text-link">
                    Read the guide <Icon name="arrow-right" size={14} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {shown.total > LIST_PER_PAGE ? (
          <Pagination
            page={shown.page}
            perPage={LIST_PER_PAGE}
            total={shown.total}
            perPageOptions={[LIST_PER_PAGE]}
            query={pagingQuery(params)}
            className="mt-6"
          />
        ) : null}
        {guides.length ? null : (
          <p className="rounded-card bg-subtle p-5 type-body-sm text-body">
            Buyer&apos;s guides are being written. Until then, see{" "}
            <Link href="/knowledge/insights" className="text-link underline">
              Insights
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
