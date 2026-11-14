import { filterDirectory, parseDirectory, typeLabel } from "@h2india/core/directory/rules";
import { cx, MapView } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { companies } from "@/directory/data";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";

// The ecosystem map (756:13075), step 6.6: every listed organisation by state. Tiles wait for M7; the map's place shows
// the list by state, which is also its keyboard alternative (A76).
export const metadata: Metadata = {
  title: "Ecosystem map · H2 India",
  description: "Who is building what in India's hydrogen economy, state by state.",
  alternates: { canonical: "/directory/map" },
};
export const dynamic = "force-dynamic";

export default async function EcosystemMap() {
  const result = filterDirectory(await companies(), parseDirectory({}));
  return (
    <main id="main" className={cx(wrap, "flex flex-col gap-6 py-8 pb-16")}>
      <Crumbs items={[{ label: "Directory", href: "/directory/companies" }, { label: "Ecosystem map" }]} />
      <h1 className="type-h1 text-primary">Ecosystem map</h1>
      <p className="type-body text-body">Who is building what, state by state. {result.total} organisations.</p>
      <MapView
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
