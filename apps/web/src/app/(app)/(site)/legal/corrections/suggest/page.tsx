import type { Metadata } from "next";
import { cx } from "@h2india/ui";
import { Crumbs, wrap } from "@/opportunities/parts";
import { CorrectionForm } from "@/submissions/forms";
import { SideBoxes } from "@/submissions/parts";

// Suggest a correction (504:455, received 505:247; step 5.7). No account needed. The page it's about comes from the
// link the reader followed (?page=).

export const metadata: Metadata = {
  title: "Suggest a correction · H2 Economy",
  description: "Found a mistake on H2 Economy? Tell us what's wrong and we'll check it against the source.",
  alternates: { canonical: "/legal/corrections/suggest" },
};
export const dynamic = "force-dynamic";

export default async function SuggestCorrectionPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const raw = (await searchParams).page ?? "";
  const page = raw.startsWith("/") && !raw.startsWith("//") ? raw.slice(0, 300) : "";
  return (
    <main id="main" className="min-h-screen bg-subtle pb-16 [&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Corrections", href: "/legal/corrections" }, { label: "Suggest a correction" }]} />
        <h1 className="mt-2 type-h1 text-primary">Suggest a correction</h1>
        <p className="type-body text-body">
          Found a mistake on H2 Economy? Tell us what&apos;s wrong and we&apos;ll check it against the source.
        </p>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pt-6 lg:flex-row lg:items-start")}>
        <CorrectionForm page={page} />
        <SideBoxes
          next={[
            "We check it against the source, usually within 2 working days.",
            "If we change the page, we add a correction note at the bottom.",
            "If you left an email, we tell you the outcome.",
          ]}
          guidelines={[
            "One correction per form",
            "Link to a source we can check",
            "For your own company's profile, claim it or contact support",
          ]}
          money={{
            title: "Free",
            text: "Corrections are always free. We never take payment to change what we report.",
          }}
        />
      </div>
    </main>
  );
}
