import { getDb } from "@h2india/core";
import type { Actor } from "@h2india/core/authz";
import { listingQueue } from "@h2india/core/products";
import { QUEUES, type QueueKey } from "@h2india/core/queues";
import { moderationQueue } from "@h2india/core/rfq";
import { storefrontQueue } from "@h2india/core/supplier";
import { cx } from "@h2india/ui";
import Link from "next/link";
import { queueItems } from "@/admin/queues/data";

// The queue tabs on Queues (627:8 to 630:968), each with its count (step 11.2).

export interface QueueSummary {
  count: number;
  /** When the oldest waiting item arrived, or null when nothing waits. */
  oldest: Date | null;
}

const oldestOf = (dates: (Date | null | undefined)[]) =>
  dates.reduce<Date | null>((min, d) => (d && (!min || d < min) ? d : min), null);

/** Each queue's count and oldest item, from the same reads the queue pages list (Queues overview and tabs). */
export async function queueSummaries(actor: Actor): Promise<Record<QueueKey, QueueSummary>> {
  const db = getDb();
  const [listings, storefronts, rfqs, ...rest] = await Promise.all([
    listingQueue(db, actor),
    storefrontQueue(db, actor),
    moderationQueue(db, actor),
    ...(["suppliers", "content", "events", "jobs", "comments", "categories", "inbox"] as const).map((q) =>
      queueItems(actor, q),
    ),
  ]);
  const [suppliers, content, events, jobs, comments, categories, inbox] = rest;
  const of = (items: { submittedAt: Date | null }[] | undefined): QueueSummary => ({
    count: items?.length ?? 0,
    oldest: oldestOf((items ?? []).map((x) => x.submittedAt)),
  });
  return {
    suppliers: of(suppliers),
    // The Listings tab holds storefront changes too (founder QC, 17 Nov 2026: its count left them out).
    listings: {
      count: listings.length + storefronts.length,
      oldest: oldestOf([...listings.map((x) => x.r.submittedAt), ...storefronts.map((x) => x.r.submittedAt)]),
    },
    rfqs: { count: rfqs.length, oldest: oldestOf(rfqs.map((x) => x.rfq.submittedAt)) },
    content: of(content),
    events: of(events),
    jobs: of(jobs),
    comments: of(comments),
    categories: of(categories),
    inbox: of(inbox),
  };
}

export async function queueCounts(actor: Actor): Promise<Record<QueueKey, number>> {
  const s = await queueSummaries(actor);
  return Object.fromEntries(QUEUES.map((q) => [q.key, s[q.key].count])) as Record<QueueKey, number>;
}

export async function QueueTabs({ current, actor }: { current: QueueKey; actor: Actor }) {
  const counts = await queueCounts(actor);
  return (
    <div className="flex flex-col gap-3">
      {/* Founder QC (17 Nov 2026): everything, not only what waits for a decision. */}
      <p className="flex flex-wrap gap-4 type-label">
        <span className="text-secondary">Browse everything:</span>
        <Link href="/admin/listings" className="text-link underline">
          All products
        </Link>
        <Link href="/admin/rfqs" className="text-link underline">
          All RFQs
        </Link>
      </p>
      <nav aria-label="Queues" className="flex gap-6 overflow-x-auto border-b border-default">
        {QUEUES.map((t) => (
          <Link
            key={t.key}
            href={`/admin/queues/${t.key}`}
            aria-current={t.key === current ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 whitespace-nowrap type-label",
              t.key === current ? "border-inverse" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
