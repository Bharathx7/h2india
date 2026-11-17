"use client";

import { SiteFooter, SiteHeader, type MegaSection, type SiteUser } from "@h2india/ui";
import type { ReactNode } from "react";
import {
  canRequestQuote,
  FOOTER_COLUMNS,
  footerFor,
  footerWithoutQuote,
  MEGA_MENUS,
  menusFor,
  menusWithoutQuote,
  SITE_LINKS,
} from "@/lib/site-nav";
import { SiteBell } from "./SiteBell";
import { HeaderSearch, useHeaderSearch } from "./HeaderSearch";
import { subscribeToNewsletter } from "@/server/public-forms";
import { Analytics } from "@/consent/Analytics";
import { CookieBanner } from "@/consent/CookieBanner";

// The public site's header and footer (Site header 25:635, Footer v2 153:179) around every public page. The header's
// search opens the search overlay (step 5.2); the footer signs people up for H2 Economy Weekly (A46).

/** The footer's topic chips (153:179) and the newsletter topics they stand for. */
const FOOTER_TOPICS: Record<string, string> = {
  Policy: "policy",
  Tenders: "tenders-schemes",
  Projects: "projects",
  Technology: "technology",
  Mobility: "mobility",
};

export function SiteChrome({
  user,
  operator = false,
  member = false,
  menus = MEGA_MENUS,
  children,
}: {
  user: SiteUser | null;
  operator?: boolean;
  /** May open member features, so the Directory shows in the menus (members and staff). */
  member?: boolean;
  /** The mega menus with the live catalogue (menusWithCatalogue); the fixed lists otherwise. */
  menus?: MegaSection[];
  children: ReactNode;
}) {
  const search = useHeaderSearch();
  // Request a quote is for buyers and signed-out visitors (public QC 4).
  const quote = canRequestQuote(user);
  const sections = menusFor(quote ? menus : menusWithoutQuote(menus), member);
  const columns = footerFor(quote ? FOOTER_COLUMNS : footerWithoutQuote(FOOTER_COLUMNS), member);
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-page px-4 py-2 type-label text-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SiteHeader
        sections={sections}
        showRequestQuote={quote}
        notifications={user ? <SiteBell unread={user.unread} /> : undefined}
        links={SITE_LINKS}
        tagline="India's hydrogen ecosystem platform"
        user={user}
        onOpenSearch={() => {
          search.setOpen(true);
        }}
      />
      <HeaderSearch search={search} canQuote={quote} />
      {children}
      <SiteFooter
        columns={columns}
        topics={Object.keys(FOOTER_TOPICS)}
        onSubscribe={async (email, topics) => {
          const result = await subscribeToNewsletter({
            email,
            topics: topics.map((t) => FOOTER_TOPICS[t] ?? t),
            source: "footer",
            // The footer form lives in @h2india/ui, so only the timing half of the form guard applies (step 5.9).
            guard: { website: "", elapsedMs: Date.now() - performance.timeOrigin },
          });
          return result.status === "sent" || result.status === "already";
        }}
      />
      <CookieBanner />
      <Analytics operator={operator} />
    </>
  );
}
