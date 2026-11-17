import { getDb } from "@h2india/core";
import { unansweredRfqs } from "@h2india/core/admin";
import { formatIstDateTime } from "@h2india/core/time";
import { EmptyState, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// RFQs waiting for quotes (founder QC, 17 Nov 2026): the Overview tile "RFQs unanswered" opened the moderation queue,
// which never lists them. These RFQs went out to suppliers; at least one hasn't quoted or declined after the queueAmber
// clock. Nothing is decided here: an operator follows up with the supplier.
export const metadata: Metadata = { title: "RFQs waiting for quotes · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UnansweredRfqsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("queues.view", "/admin/queues/rfqs/unanswered");
  const rows = await unansweredRfqs(getDb(), actor);
  const paged = pageOf(rows, pageRequest(sp));
  return (
    <AdminShell userId={userId} current="/admin/queues">
      <Link href="/admin" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Overview
      </Link>
      <div>
        <h1 className="type-h2">RFQs waiting for quotes</h1>
        <p className="type-body text-secondary">
          Sent to suppliers, with at least one supplier who hasn&apos;t quoted or declined yet. Follow up with them.
        </p>
      </div>
      {rows.length ? (
        <>
          <div
            className="relative overflow-x-auto rounded-card border border-default"
            tabIndex={0}
            role="region"
            aria-label="RFQs waiting for quotes"
          >
            <table className="w-full min-w-200 text-left">
              <thead className="bg-subtle type-label-sm">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    RFQ
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Buyer
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Sent
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Waiting on
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((r) => (
                  <tr key={r.id} className="border-t border-default align-top">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link href={`/admin/queues/rfqs/${r.id}`} className="block type-label text-link underline">
                        {r.reference}
                      </Link>
                      {r.title ? <span className="block type-caption text-secondary">{r.title}</span> : null}
                    </th>
                    <td className="px-2 py-3 type-body-sm">{r.buyer}</td>
                    <td className="px-2 py-3 type-body-sm">{r.sentAt ? formatIstDateTime(r.sentAt) : ""}</td>
                    <td className="px-2 py-3 type-body-sm">{r.waitingOn.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPager paged={paged} query={pagingQuery(sp)} />
        </>
      ) : (
        <EmptyState kind="first-use" icon="check-circle" title="Every open RFQ has an answer">
          RFQs show here when a supplier hasn&apos;t quoted or declined a day after it went out.
        </EmptyState>
      )}
    </AdminShell>
  );
}
