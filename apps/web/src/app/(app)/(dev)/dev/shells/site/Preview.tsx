"use client";

import { FOOTER_COLUMNS, MEGA_MENUS, SITE_LINKS } from "@/lib/site-nav";
import { AnnouncementBar, CookieBanner, SiteFooter, SiteHeader, type MegaSection } from "@h2india/ui";
import { useState } from "react";

// Sample live data, as shown in Figma, for this preview only. In the app it comes from the catalogue,
// sponsorship, tracker and events data.
const SAMPLE: MegaSection[] = MEGA_MENUS.map((s) => {
  if (s.id === "marketplace" && s.classes) {
    const counts: Record<string, number> = { systems: 30, components: 69, equipment: 17, services: 11, materials: 10 };
    return {
      ...s,
      classes: s.classes.map((c) => ({ ...c, count: counts[c.id] })),
      sponsor: {
        name: "Sahyadri Electrolysers Pvt Ltd",
        detail: "PEM electrolyser stacks · Pune, Maharashtra",
        href: "#sponsor",
        verified: true,
      },
    };
  }
  if (s.id === "knowledge") {
    return {
      ...s,
      promo: {
        eyebrow: "India Hydrogen Tracker",
        title: "8.62 lakh t/yr awarded",
        text: "Green hydrogen production awarded under SIGHT. Data as of 10 Nov 2026 · Source: SECI.",
        action: { label: "Open the tracker", href: "/tracker", style: "arrow" as const },
      },
    };
  }
  if (s.id === "events") {
    return {
      ...s,
      links: [
        { label: "Webinar · 18 Nov · Specifying PEM electrolysers for Indian sites", href: "#e1" },
        { label: "Summit · 4–5 Dec · Green Hydrogen India, New Delhi", href: "#e2" },
        { label: "Training · 12 Dec · Hydrogen safety basics (online)", href: "#e3" },
      ],
    };
  }
  return s;
});

export function SitePreview({ loggedIn }: { loggedIn: boolean }) {
  const [searches, setSearches] = useState(0);
  return (
    <>
      <AnnouncementBar>Request quotes from up to 5 verified suppliers in one request</AnnouncementBar>
      <SiteHeader
        sections={SAMPLE}
        links={SITE_LINKS}
        tagline="India's hydrogen ecosystem platform"
        onOpenSearch={() => {
          setSearches((n) => n + 1);
        }}
        user={
          loggedIn
            ? {
                name: "Ravi Kulkarni",
                initials: "RK",
                organisation: "Greenfield Hydrogen",
                workspace: "Buyer",
                workspaceHref: "/buyer",
                unread: 3,
              }
            : null
        }
      />
      <main id="main" className="mx-auto min-h-[120vh] max-w-300 px-6 py-16">
        <h1 className="type-h1">Site chrome</h1>
        <p className="mt-2 type-body text-body">
          Header, mega menus, footer, announcement bar and cookie banner from Figma. Search opened {searches} times (the
          Search overlay is built with search in Stage 4).
        </p>
      </main>
      <SiteFooter
        columns={FOOTER_COLUMNS}
        onSubscribe={() =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve(true);
            }, 300),
          )
        }
      />
      <CookieBanner preferencesHref="/legal/cookies#preferences" />
    </>
  );
}
