import { isEnabled } from "@h2india/config";
import { getDb } from "@h2india/core";
import { compareProducts, getCompareList } from "@h2india/core/products";
import { COMPARE_LIMIT } from "@h2india/core/products/rules";
import { buttonClasses, cx, EmptyState, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { showSample } from "@/cms/sample";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";
import { getSession } from "@/server/auth";
import { CompareTable } from "./CompareTable";

// Compare (91:9; phones 98:3084; empty 128:23596, loading 128:23616, error 128:23655), step 6.5. The products come
// from the address (?ids=), or for a signed-in person with none in the address, from their saved selection.
export const metadata: Metadata = {
  title: "Compare products · H2 India",
  description: "Compare hydrogen products side by side by specification.",
  alternates: { canonical: "/marketplace/compare" },
};
export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; state?: string }>;
}) {
  const params = await searchParams;
  const forced = forcedState(params.state);
  const session = await getSession();
  const db = getDb();
  const fromUrl = (params.ids ?? "").split(",").filter(Boolean);
  const ids = fromUrl.length ? fromUrl : session ? await getCompareList(db, session.user.id) : [];
  const result = await compareProducts(db, ids, {
    includeSample: showSample(),
    transactions: isEnabled("transactions"),
  });
  const title = result.kind === "ok" ? `Compare ${result.category.label.toLowerCase()}` : "Compare products";

  return (
    <main id="main" className={cx(wrap, "flex flex-col gap-6 py-8 pb-16 [&_:is(h1,h2,h3)]:text-wrap")}>
      <Crumbs
        items={[
          ...(result.kind === "ok"
            ? [{ label: result.category.label, href: result.category.href }]
            : [{ label: "Marketplace", href: "/marketplace" }]),
          { label: "Compare" },
        ]}
      />
      <h1 className="type-h1 text-primary">{title}</h1>
      <LiveSection
        label="Comparison"
        state={forced ?? (result.kind === "ok" ? "ready" : "empty")}
        errorTitle="We couldn't load the comparison"
        errorText="Check your connection and try again. Your selection is kept."
        skeleton={<Skeleton kind="card" className="h-96" />}
        empty={
          result.kind === "mixed" ? (
            <div className="rounded-card border border-default bg-subtle">
              <EmptyState
                kind="no-results"
                title="These products are from different categories"
                action={
                  <Link href="/marketplace/compare" className={buttonClasses({ variant: "outline" })}>
                    Start again
                  </Link>
                }
              >
                {`Compare works within one category, so the rows line up. You picked ${result.categories.join(" and ")}; keep the products from one of them.`}
              </EmptyState>
            </div>
          ) : (
            <div className="rounded-card border border-default bg-subtle">
              <EmptyState
                title="Nothing to compare yet"
                action={
                  <Link href="/marketplace" className={buttonClasses({})}>
                    Browse the marketplace
                  </Link>
                }
              >
                {`Pick Compare on up to ${String(COMPARE_LIMIT)} products from one category, then open this page.`}
              </EmptyState>
            </div>
          )
        }
      >
        {result.kind === "ok" ? (
          <CompareTable
            result={result}
            limit={COMPARE_LIMIT}
            signedIn={Boolean(session)}
            categorySlug={result.category.href.split("/").at(-1) ?? ""}
          />
        ) : null}
      </LiveSection>
    </main>
  );
}
