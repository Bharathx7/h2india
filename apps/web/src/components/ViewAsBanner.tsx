"use client";

import { useEffect, useState } from "react";

// Viewing as … · read-only (657:486), on every page while an operator views as someone (step 11.4). The secret token
// is in an httpOnly cookie; this reads only a display cookie (name and end time) so pages can stay static.

export const VIEW_AS_DISPLAY_COOKIE = "h2_view_as_display";

function read(): { name: string; until: string } | null {
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${VIEW_AS_DISPLAY_COOKIE}=`))
      ?.slice(VIEW_AS_DISPLAY_COOKIE.length + 1);
    if (!raw) return null;
    const v = JSON.parse(decodeURIComponent(raw)) as { name?: unknown; until?: unknown };
    return typeof v.name === "string" && typeof v.until === "string" ? { name: v.name, until: v.until } : null;
  } catch {
    return null;
  }
}

export function ViewAsBanner() {
  const [v, setV] = useState<{ name: string; until: string } | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a cookie once after mount
    setV(read());
  }, []);
  if (!v) return null;
  const until = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(v.until));
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-warning px-4 py-2"
    >
      <p className="type-label">
        Viewing as {v.name} · read-only · ends at {until} IST. Nothing you do here is saved.
      </p>
      <form method="post" action="/api/view-as/end">
        <button type="submit" className="rounded-pill border border-control bg-page px-3 py-1 type-label">
          End view as
        </button>
      </form>
    </div>
  );
}
