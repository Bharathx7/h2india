import { filterDirectory, parseDirectory, typeLabel } from "@h2india/core/directory/rules";
import { MapView, stateBubbles } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { companies } from "@/directory/data";
import { DirectoryTabs, MEMBER_DIRECTORY } from "@/directory/tabs";
import { MemberShell, requireMember } from "@/member/shell";

// The ecosystem map (756:13075), step 6.6: every listed organisation by state. Tiles wait for M7; the map's place shows
// the state-bubble stand-in (A176) until M7, with the list by state as its keyboard alternative (A76).
export const metadata: Metadata = { title: "Ecosystem map · Directory · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EcosystemMap() {
  const userId = await requireMember(MEMBER_DIRECTORY.map);
  const result = filterDirectory(await companies(), parseDirectory({}));
  return (
    <MemberShell userId={userId} current="/member/directory">
      <DirectoryTabs current="map" />
      <div className="flex flex-col gap-6">
        <h1 className="type-h2 text-primary">Ecosystem map</h1>
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
      </div>
    </MemberShell>
  );
}
