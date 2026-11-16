import type { ReactNode } from "react";
import { DirectoryGate } from "@/directory/DirectoryGate";
import { siteViewer } from "@/server/site";

// Public QC, 16 Nov 2026: the Directory (companies, company profiles, people, the map, associations and start-ups)
// opens only for signed-in people: members, buyers, suppliers and staff. Visitors are asked to sign in or join, and
// none of the page is sent to them.
export default async function DirectoryLayout({ children }: { children: ReactNode }) {
  const viewer = await siteViewer();
  return viewer ? children : <DirectoryGate />;
}
