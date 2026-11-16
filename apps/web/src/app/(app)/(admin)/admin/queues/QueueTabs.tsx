import { getDb } from "@h2india/core";
import type { Actor } from "@h2india/core/authz";
import { listingQueue } from "@h2india/core/products";
import { QUEUES, type QueueKey } from "@h2india/core/queues";
import { moderationQueue } from "@h2india/core/rfq";
import { cx } from "@h2india/ui";
import Link from "next/link";
import { queueItems } from "@/admin/queues/data";

// The queue tabs on Queues (627:8 to 630:968), each with its count (step 11.2).

export async function queueCounts(actor: Actor): Promise<Record<QueueKey, number>> {
  const db = getDb();
  const [listings, rfqs, ...rest] = await Promise.all([
    listingQueue(db, actor),
    moderationQueue(db, actor),
    ...(["suppliers", "content", "events", "jobs", "comments", "categories"] as const).map((q) => queueItems(actor, q)),
  ]);
  const [suppliers, content, events, jobs, comments, categories] = rest;
  return {
    suppliers: suppliers?.length ?? 0,
    listings: listings.length,
    rfqs: rfqs.length,
    content: content?.length ?? 0,
    events: events?.length ?? 0,
    jobs: jobs?.length ?? 0,
    comments: comments?.length ?? 0,
    categories: categories?.length ?? 0,
  };
}

export async function QueueTabs({ current, actor }: { current: QueueKey; actor: Actor }) {
  const counts = await queueCounts(actor);
  return (
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
  );
}
