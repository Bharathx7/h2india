import { filterDirectory, parseDirectory, typeLabel } from "@h2india/core/directory/rules";
import { cx, MapView, stateBubbles } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { companies } from "@/directory/data";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";
import { needsMembership } from "@/directory/gate";
import { MembersOnly } from "@/directory/MembersOnly";

// The ecosystem map (756:13075), step 6.6: every listed organisation by state. Tiles wait for M7; the map's place shows
// the state-bubble stand-in (A176) until M7, with the list by state as its keyboard alternative (A76).
export const metadata: Metadata = {
  title: "Ecosystem map · H2 Economy",
  description: "Who is building what in India's hydrogen economy, state by state.",
  alternates: { canonical: "/directory/map" },
};
export const dynamic = "force-dynamic";

export default async function EcosystemMap() {
  // Founder QC (17 Nov 2026): Directory browsing is for members; buyers and suppliers join first.
  if (await needsMembership()) return <MembersOnly />;
  const result = filterDirectory(await companies(), parseDirectory({}));
  return (
    <main id="main" className={cx(wrap, "flex flex-col gap-6 py-8 pb-16")}>
      <Crumbs items={[{ label: "Directory", href: "/directory/companies" }, { label: "Ecosystem map" }]} />
      <h1 className="type-h1 text-primary">Ecosystem map</h1>
      <p className="type-body text-body">Who is building what, state by state. {result.total} organisations.</p>
      <MapView
        provider={stateBubbles}
        label="India's hydrogen ecosystem"
        points={result.all.map((e) => ({
          id: e.id,
          label: e.name,
          href: e.href,
          group: e.state || "State not given",
          detail: typeLabel(e),
        }))}
        renderLink={({ href, className, children }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
      />
    </main>
  );
}
