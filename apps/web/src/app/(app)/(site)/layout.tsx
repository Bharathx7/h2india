import type { ReactNode } from "react";
import { SiteChrome } from "@/components/SiteChrome";
import { ComingSoon } from "@/home/ComingSoon";
import { comingSoonFor, siteViewer } from "@/server/site";

// Public pages (Stage 5): the site header and footer around each page. While the comingSoon flag is on, visitors get
// the pre-launch page instead; signed-in operators and the allow-list see the real site (step 5.1, A44).
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const viewer = await siteViewer();
  const prelaunch = await comingSoonFor(viewer);
  if (prelaunch) return <ComingSoon launchLine={prelaunch.launchLine} />;
  return (
    <SiteChrome user={viewer?.user ?? null} operator={viewer?.operator ?? false}>
      {children}
    </SiteChrome>
  );
}
