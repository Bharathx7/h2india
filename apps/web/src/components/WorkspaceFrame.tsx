"use client";

import { BellPanel, WorkspaceShell, type WorkspaceArea, type WorkspaceNavGroup, type WorkspaceUser } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { bellData, markAllRead, markOneRead } from "@/app/(app)/(workspace)/notifications/actions";
import type { Row } from "@/app/(app)/(workspace)/notifications/rows";

// The workspace shell with the live bell (97:3168): unread count, latest five, Mark all read. Refreshes every minute
// and whenever the panel opens.

export function WorkspaceFrame(props: {
  area: WorkspaceArea;
  groups: WorkspaceNavGroup[];
  current: string;
  user: WorkspaceUser;
  welcome: string;
  home: string;
  bell: { unread: number; items: Row[] };
  children: ReactNode;
}) {
  const router = useRouter();
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
      welcome={props.welcome}
      // The admin top bar searches the back office (636:599); the others keep the shell's default.
      searchPlaceholder={props.area === "admin" ? "Search suppliers, listings, RFQs, users" : undefined}
      // Workspace top bar v2 (194:1191) has a help button: the help centre.
      helpHref="/help"
      profileHref={props.home}
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
      {props.children}
    </WorkspaceShell>
  );
}
