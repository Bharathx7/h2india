import type { ReactNode } from "react";
import { SiteChrome } from "@/components/SiteChrome";
import { siteViewer } from "@/server/site";

// Newsletter pages (step 5.1, A46) and turning off an alert (step 7.3). Outside the Coming soon gate, so links in
// emails sent before launch keep working.
export default async function NewsletterLayout({ children }: { children: ReactNode }) {
  const viewer = await siteViewer();
  return (
    <SiteChrome user={viewer?.user ?? null} operator={viewer?.operator ?? false}>
      {children}
    </SiteChrome>
  );
}
