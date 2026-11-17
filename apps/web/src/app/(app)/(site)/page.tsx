import type { Metadata } from "next";
import { Suspense } from "react";
import { forcedFailures } from "@/home/data";
import {
  EventsLearning,
  FinalCta,
  Insights,
  NewsSkeleton,
  Opportunities,
  OpportunitiesSkeleton,
  WhyItMatters,
} from "@/home/sections-content";
import { FeaturedProducts, Marketplace, PlatformFeatures } from "@/home/sections-market";
import { ChoosePath, FiguresSkeleton, ForYou, Hero, HowItWorks, LiveFigures, TrustStrip } from "@/home/sections-top";
import { forcedState } from "@/lib/dev-state";
import { siteViewer } from "@/server/site";
import { JsonLd, organizationLd, websiteLd } from "@/seo/jsonld";

// Home (Figma 365:27737): logged out 377:4917, logged in 379:4688, phones 381:5845, loading modules 381:12972, module
// error and empty 381:13116, motion spec 781:7247. Every data section is its own server component with its own query,
// streamed behind its loading skeleton, so a slow or failing module never holds up or blanks the page (step 5.1).
// Development only: ?state=loading shows the drawn skeletons; ?fail=tenders,news… forces those modules to fail.

export const metadata: Metadata = {
  title: "H2 Economy · India's hydrogen ecosystem platform",
  description:
    "Find hydrogen products and verified suppliers, follow Indian hydrogen news, and act on schemes and tenders.",
};
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; fail?: string | string[] }>;
}) {
  const params = await searchParams;
  const fail = forcedFailures(params.fail);
  const loading = forcedState(params.state) === "loading";
  const viewer = await siteViewer();
  return (
    // Figma wraps headings line by line; the site-wide balanced wrapping would break them differently.
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <JsonLd data={organizationLd()} />
      <JsonLd data={websiteLd()} />
      <Hero fail={fail} />
      <Suspense fallback={null}>
        <TrustStrip fail={fail} />
      </Suspense>
      {loading ? (
        <FiguresSkeleton />
      ) : (
        <Suspense fallback={<FiguresSkeleton />}>
          <LiveFigures fail={fail} />
        </Suspense>
      )}
      {viewer ? <ForYou firstName={viewer.firstName} workspaceHref={viewer.user.workspaceHref} /> : <ChoosePath />}
      <HowItWorks />
      <Marketplace />
      <FeaturedProducts />
      <PlatformFeatures />
      {loading ? (
        <OpportunitiesSkeleton />
      ) : (
        <Suspense fallback={<OpportunitiesSkeleton />}>
          <Opportunities fail={fail} signedIn={Boolean(viewer)} />
        </Suspense>
      )}
      {loading ? (
        <NewsSkeleton />
      ) : (
        <Suspense fallback={<NewsSkeleton />}>
          <Insights fail={fail} />
        </Suspense>
      )}
      <WhyItMatters />
      <Suspense fallback={null}>
        <EventsLearning fail={fail} />
      </Suspense>
      <FinalCta />
    </main>
  );
}
