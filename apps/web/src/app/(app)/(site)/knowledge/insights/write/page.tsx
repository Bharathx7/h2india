import type { Metadata } from "next";
import { cx } from "@h2india/ui";
import { Crumbs, wrap } from "@/opportunities/parts";
import { PitchForm } from "@/submissions/forms";
import { SideBoxes } from "@/submissions/parts";

// Write for us (504:985, received 505:288; step 5.7). A pitch first, not a finished article. No account needed.

export const metadata: Metadata = {
  title: "Write for us · H2 Economy",
  description: "Pitch analysis or an explainer to H2 Economy's editors.",
  alternates: { canonical: "/knowledge/insights/write" },
};

export default function WriteForUsPage() {
  return (
    <main id="main" className="min-h-screen bg-subtle pb-16 [&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Insights", href: "/knowledge/insights" }, { label: "Write for us" }]} />
        <h1 className="mt-2 type-h1 text-primary">Write for us</h1>
        <p className="type-body text-body">
          We publish analysis and explainers from people who work in India&apos;s hydrogen industry. Send a pitch first,
          not a finished article.
        </p>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pt-6 lg:flex-row lg:items-start")}>
        <PitchForm />
        <SideBoxes
          next={[
            "An editor reads every pitch.",
            "We reply by email, whether or not we take it.",
            "If we go ahead, we agree a length and deadline with you.",
          ]}
          guidelines={[
            "Original work, not published elsewhere",
            "Analysis, not promotion of your company",
            "We edit for clarity and check every claim",
          ]}
          money={{
            title: "Free or paid",
            text: "Writing for us is free. We don't take payment to publish articles. Sponsored content is separate and always labelled.",
          }}
        />
      </div>
    </main>
  );
}
