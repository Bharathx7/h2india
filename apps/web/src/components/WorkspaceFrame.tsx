"use client";

import {
  BellPanel,
  Toaster,
  WorkspaceShell,
  type WorkspaceArea,
  type WorkspaceNavGroup,
  type WorkspaceSearchLink,
  type WorkspaceUser,
} from "@h2india/ui";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { bellData, markAllRead, markOneRead } from "@/app/(app)/(workspace)/notifications/actions";
import type { Row } from "@/app/(app)/(workspace)/notifications/rows";
import { HeaderSearch, useHeaderSearch } from "./HeaderSearch";
import { SignedInAsNote } from "./SignedInAsNote";

// The workspace shell with the live bell (97:3168): unread count, latest five, Mark all read. Refreshes every minute
// and whenever the panel opens. Search (founder QC, 17 Nov 2026): buyers, suppliers and members open the site search
// (Request a quote only for buyers, canRequestQuote); the back office searches its own Users, Listings and RFQs.

const PLACEHOLDER = {
  buyer: "Search products, suppliers or specs",
  supplier: "Search products, companies, news",
  member: "Search news, tenders, companies",
  admin: "Search users, listings, RFQs",
} as const;

/** The back office's search: the same lists the operator can filter by words today. */
function adminSearch(q: string): WorkspaceSearchLink[] {
  const words = encodeURIComponent(q);
  return [
    { label: `Users and companies matching “${q}”`, href: `/admin/users?q=${words}` },
    { label: `Listings in review matching “${q}”`, href: `/admin/queues/listings?q=${words}` },
    { label: `RFQs matching “${q}”`, href: `/admin/queues/rfqs?q=${words}` },
  ];
}

export function WorkspaceFrame(props: {
  area: WorkspaceArea;
  groups: WorkspaceNavGroup[];
  current: string;
  user: WorkspaceUser;
  home: string;
  bell: { unread: number; items: Row[] };
  action?: ReactNode;
  /** Another workspace for this person in the profile menu (founder QC, 17 Nov 2026). */
  switchTo?: { label: string; href: string } | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const search = useHeaderSearch();
  const staff = props.area === "admin";
  const [bell, setBell] = useState(props.bell);
  // New server data (after a navigation or refresh) replaces what the bell shows.
  const [seen, setSeen] = useState(props.bell);
  if (seen !== props.bell) {
    setSeen(props.bell);
    setBell(props.bell);
  }
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(() => {
    setLoading(true);
    void bellData().then((b) => {
      setBell(b);
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    const timer = setInterval(refresh, 60_000);
    return () => {
      clearInterval(timer);
    };
  }, [refresh]);
  return (
    <WorkspaceShell
      area={props.area}
      groups={props.groups}
      currentHref={props.current}
      user={props.user}
      searchPlaceholder={PLACEHOLDER[props.area]}
      onSearch={
        staff
          ? undefined
          : () => {
              search.setOpen(true);
            }
      }
      searchLinks={staff ? adminSearch : undefined}
      action={props.action}
      switchTo={props.switchTo}
      profileHref="/account"
      logoutHref="/sign-out"
      homeHref="/"
      notifications={
        <BellPanel
          items={bell.items}
          unread={bell.unread}
          loading={loading}
          allHref="/notifications"
          onOpenChange={(open) => {
            if (open) refresh();
          }}
          onOpen={(id) => {
            void markOneRead(id);
          }}
          onMarkAllRead={() => {
            setBell((b) => ({ unread: 0, items: b.items.map((i) => ({ ...i, unread: false })) }));
            void markAllRead().then(() => {
              router.refresh();
            });
          }}
        />
      }
    >
      {staff ? null : <HeaderSearch search={search} canQuote={props.area === "buyer"} />}
      {/* Toasts for every workspace page (Toast 22:150), so a page's controls can confirm what they did. */}
      <Toaster>
        {/* After signing in on another account's page (public QC 2): which account this is. */}
        <Suspense fallback={null}>
          <SignedInAsNote area={props.area} />
        </Suspense>
        {props.children}
      </Toaster>
    </WorkspaceShell>
  );
}
