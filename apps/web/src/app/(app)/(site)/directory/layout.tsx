import type { ReactNode } from "react";
import { DirectoryGate } from "@/directory/DirectoryGate";
import { siteViewer } from "@/server/site";

// What stays of /directory on the website (founder, 18 Nov 2026): a single company profile and its claim page, linked
// from products, RFQs and search. They open only for signed-in people (public QC, 16 Nov 2026); visitors are asked to
// sign in or join, and none of the page is sent to them. Browsing the Directory lives in the member workspace.
export default async function DirectoryLayout({ children }: { children: ReactNode }) {
  const viewer = await siteViewer();
  return viewer ? children : <DirectoryGate />;
}
