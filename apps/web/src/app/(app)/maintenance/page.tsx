import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { Icon, Logo } from "@h2india/ui";

// Planned maintenance (679:620, step 5.10). While FLAG_MAINTENANCE is on, the proxy shows this page (503) for every
// public address; the CMS and APIs stay reachable. The times come from the CMS setting Planned maintenance; if the
// database is part of the work, the page still shows without them.

export const metadata: Metadata = { title: "Planned maintenance · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const time = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});
const day = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const t = (d: Date) => `${time.format(d).toUpperCase()} IST`;

async function window(): Promise<{ startedAt: Date | null; backBy: Date | null; statusUrl: string | null }> {
  try {
    const m = await (await getPayload({ config })).findGlobal({ slug: "maintenance", depth: 0 });
    return {
      startedAt: m.startedAt ? new Date(m.startedAt) : null,
      backBy: m.backBy ? new Date(m.backBy) : null,
      statusUrl: m.statusUrl ?? null,
    };
  } catch {
    return { startedAt: null, backBy: null, statusUrl: null };
  }
}

export default async function MaintenancePage() {
  const w = await window();
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-page px-4 py-16">
      <div className="flex w-full max-w-108 flex-col gap-4">
        <Logo />
        <p className="type-label-sm text-secondary">Planned maintenance</p>
        <h1 className="type-h2 text-primary">We&apos;re upgrading H2 Economy</h1>
        <p className="type-body text-body">
          H2 Economy is offline for planned work on our servers. Your account, orders, quotes and payments are safe, and
          nothing you saved will be lost.
        </p>
        <div className="flex flex-col gap-1 rounded-card bg-mint p-5">
          <p className="type-h3 text-primary">{w.backBy ? `Back by ${t(w.backBy)}` : "Back shortly"}</p>
          {w.backBy ? (
            <p className="type-body-sm text-body">
              {day.format(w.backBy)}
              {w.startedAt ? ` · started ${t(w.startedAt)}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          {/* Our own status page until a status provider is chosen (M26, A176). */}
          <a
            href={w.statusUrl ?? "/status"}
            className="inline-flex items-center gap-2 type-label-sm text-link underline"
          >
            <Icon name="external-link" size={16} /> Live status updates
          </a>
          <Link href="/newsletter" className="inline-flex items-center gap-2 type-label-sm text-link underline">
            <Icon name="mail" size={16} /> Read H2 Economy Weekly while you wait
          </Link>
        </div>
      </div>
    </main>
  );
}
