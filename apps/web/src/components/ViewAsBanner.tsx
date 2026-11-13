"use client";

import { Icon } from "@h2india/ui";
import { useEffect, useState } from "react";

// Read-only view as … (657:486), on every page while an operator views as someone (step 11.4). The secret token is in
// an httpOnly cookie; this reads only a display cookie (names, times and the operator's reason) so pages stay static.

export const VIEW_AS_DISPLAY_COOKIE = "h2_view_as_display";

interface Display {
  name: string;
  until: string;
  org: string | null;
  started: string | null;
  by: string | null;
  reason: string | null;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

function read(): Display | null {
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${VIEW_AS_DISPLAY_COOKIE}=`))
      ?.slice(VIEW_AS_DISPLAY_COOKIE.length + 1);
    if (!raw) return null;
    const v = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const name = str(v.name);
    const until = str(v.until);
    if (!name || !until) return null;
    return { name, until, org: str(v.org), started: str(v.started), by: str(v.by), reason: str(v.reason) };
  } catch {
    return null;
  }
}

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );

export function ViewAsBanner() {
  const [v, setV] = useState<Display | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a cookie once after mount
    setV(read());
  }, []);
  if (!v) return null;
  const started = [v.started ? `Started ${time(v.started)}` : null, v.by ? `by ${v.by}` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-warning px-4 py-2"
    >
      <span className="flex items-start gap-3">
        <Icon name="eye" size={18} className="mt-0.5" />
        <span>
          <span className="block type-label">
            Read-only view as {v.name}
            {v.org ? ` · ${v.org}` : ""}
          </span>
          <span className="block type-caption">
            {[started, v.reason ? `Reason: ${v.reason}` : null, `Ends ${time(v.until)}`, "Logged."]
              .filter(Boolean)
              .join(". ")
              .replace(/\.\./g, ".")}
          </span>
        </span>
      </span>
      <form method="post" action="/api/view-as/end">
        <button type="submit" className="rounded-pill border border-control bg-page px-3 py-1 type-label">
          End view
        </button>
      </form>
    </div>
  );
}
