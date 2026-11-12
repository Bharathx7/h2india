"use client";

import { SiteFooter, SiteHeader, type SiteUser } from "@h2india/ui";
import type { ReactNode } from "react";
import { FOOTER_COLUMNS, MEGA_MENUS, SITE_LINKS } from "@/lib/site-nav";
import { HeaderSearch, useHeaderSearch } from "./HeaderSearch";
import { subscribeToNewsletter } from "@/server/public-forms";

// The public site's header and footer (Site header 25:635, Footer v2 153:179) around every public page. The header's
// search opens the search overlay (step 5.2); the footer signs people up for India H₂ Weekly (A46).

/** The footer's topic chips (153:179) and the newsletter topics they stand for. */
const FOOTER_TOPICS: Record<string, string> = {
  Policy: "policy",
  Tenders: "tenders-schemes",
  Projects: "projects",
  Technology: "technology",
  Mobility: "mobility",
};

export function SiteChrome({ user, children }: { user: SiteUser | null; children: ReactNode }) {
  const search = useHeaderSearch();
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-page px-4 py-2 type-label text-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SiteHeader
        sections={MEGA_MENUS}
        links={SITE_LINKS}
        tagline="India's hydrogen ecosystem platform"
        user={user}
        onOpenSearch={() => {
          search.setOpen(true);
        }}
      />
      <HeaderSearch search={search} />
      {children}
      <SiteFooter
        columns={FOOTER_COLUMNS}
        topics={Object.keys(FOOTER_TOPICS)}
        onSubscribe={async (email, topics) => {
          const result = await subscribeToNewsletter({
            email,
            topics: topics.map((t) => FOOTER_TOPICS[t] ?? t),
            source: "footer",
          });
          return result.status === "sent" || result.status === "already";
        }}
      />
    </>
  );
}
