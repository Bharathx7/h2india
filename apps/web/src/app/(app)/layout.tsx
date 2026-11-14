import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "./fonts";
import "./globals.css";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { indexable, SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/seo/site";

// Defaults for every page (step 5.10): the canonical base, Open Graph and Twitter cards (the image is
// opengraph-image.tsx), and robots, which stay noindex until the searchIndexing flag is on at Launch 1.
export function generateMetadata(): Metadata {
  const index = indexable();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: SITE_NAME, template: "%s" },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    // No og:title here: share cards then use each page's own title; pages with a picture (articles) set their own.
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN" },
    twitter: { card: "summary_large_image" },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={fontVariables}>
      <body>
        <ViewAsBanner />
        {children}
      </body>
    </html>
  );
}
