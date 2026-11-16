"use client";

import { BellPanel } from "@h2india/ui";
import { useState } from "react";
import { bellData, markAllRead, markOneRead } from "@/app/(app)/(workspace)/notifications/actions";
import type { Row } from "@/app/(app)/(workspace)/notifications/rows";

// The public site header's bell (public QC 4, 16 Nov 2026): the same drop-down panel as the workspace top bar (97:3168),
// so people stay on the page they are reading. The latest five load when the panel opens.

export function SiteBell({ unread: initial }: { unread: number }) {
  const [data, setData] = useState<{ unread: number; items: Row[] }>({ unread: initial, items: [] });
  const [loading, setLoading] = useState(false);
  return (
    <BellPanel
      look="outline"
      items={data.items}
      unread={data.unread}
      loading={loading}
      allHref="/notifications"
      onOpenChange={(open) => {
        if (!open) return;
        setLoading(true);
        void bellData().then((b) => {
          setData(b);
          setLoading(false);
        });
      }}
      onOpen={(id) => {
        void markOneRead(id);
      }}
      onMarkAllRead={() => {
        setData((d) => ({ unread: 0, items: d.items.map((i) => ({ ...i, unread: false })) }));
        void markAllRead();
      }}
    />
  );
}
