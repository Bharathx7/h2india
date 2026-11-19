import { getDb } from "@h2india/core";
import { ageText, slaBadge } from "@h2india/core/admin";
import { clockDuration } from "@h2india/core/clocks";
import { QUEUES } from "@h2india/core/queues";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { queueSummaries } from "./QueueTabs";

// Queues overview (founder, 19 Nov 2026): Queues used to jump straight to the Suppliers tab. It now lists every queue
// with its waiting count and the oldest item's age against the SLA clocks, each opening its own tab. The counts come
// from the same reads as the tabs, so they always match.
export const metadata: Metadata = { title: "Queues · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const hoursOf = (d: { hours?: number; days?: number; workingDays?: number }) =>
  d.hours ?? (d.days ?? d.workingDays ?? 0) * 24;

const NOTES: Partial<Record<(typeof QUEUES)[number]["key"], string>> = {
  listings: "Products and storefront changes",
  inbox: "Corrections and messages",
};

export default async function QueuesPage() {
  const { userId, actor } = await requireOperator("queues.view", "/admin/queues");
  const db = getDb();
  const [summaries, amberD, redD] = await Promise.all([
    queueSummaries(actor),
    clockDuration(db, "queueAmber"),
    clockDuration(db, "queueRed"),
  ]);
  const amber = hoursOf(amberD);
  const red = hoursOf(redD);
  const now = new Date().getTime();
  return (
    <AdminShell userId={userId} current="/admin/queues" title="Queues">
      <div>
        <h1 className="type-h2">Queues</h1>
        <p className="type-body text-secondary">
          Everything waiting for a decision. Age turns amber close to the SLA and red once it&apos;s passed.
        </p>
      </div>
      <p className="flex flex-wrap gap-4 type-label">
        <span className="text-secondary">Browse everything:</span>
        <Link href="/admin/listings" className="text-link underline">
          All products
        </Link>
        <Link href="/admin/rfqs" className="text-link underline">
          All RFQs
        </Link>
      </p>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {QUEUES.map((q) => {
          const s = summaries[q.key];
          const oldest = s.oldest ? (now - s.oldest.getTime()) / 3_600_000 : null;
          const { tone, badge } = slaBadge(oldest, amber, red);
          return (
            <li key={q.key}>
              <Link
                href={`/admin/queues/${q.key}`}
                className="card-lift flex h-full flex-col gap-2 rounded-card border border-default bg-page p-5"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="type-h4">{q.label}</span>
                    {NOTES[q.key] ? <span className="type-caption text-secondary">{NOTES[q.key]}</span> : null}
                  </span>
                  <Icon name="arrow-right" size={16} />
                </span>
                <span className="flex items-center gap-2">
                  <span className="type-h2">{s.count}</span>
                  <span className="type-body-sm text-secondary">waiting</span>
                  <StatusBadge status={badge} tone={tone} />
                </span>
                <span className="mt-auto type-caption text-secondary">
                  {oldest === null ? "Nothing waiting" : `Oldest waiting ${ageText(oldest)}`} · {q.sla}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
