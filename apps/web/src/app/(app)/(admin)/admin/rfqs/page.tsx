import { getDb } from "@h2india/core";
import { listAllRfqs, RFQ_LIST_STATUSES } from "@h2india/core/admin/lists";
import { formatIstDate } from "@h2india/core/time";
import { Icon, StatusBadge, type BadgeTone } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ListFilters, ListTable } from "@/admin/ListTable";
import { AdminShell, requireOperator } from "@/admin/shell";
import { pageRequest, pageWindow, pagingQuery } from "@/lib/paging";

// All RFQs (founder QC, 17 Nov 2026): every request for quotes, whatever its status, searched by reference, title or
// buyer and paged in the database. Each opens the RFQ (decided there only while In moderation).
export const metadata: Metadata = { title: "All RFQs · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TONE: Record<string, BadgeTone> = {
  "In moderation": "progress",
  Sent: "progress",
  "Quotes received": "success",
  Returned: "warning",
  Closed: "neutral",
  Draft: "neutral",
};

export default async function AllRfqsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("queues.view", "/admin/rfqs");
  const status = (RFQ_LIST_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;
  const q = sp.q?.trim() || undefined;
  const req = pageRequest(sp);
  const { rows, total } = await listAllRfqs(getDb(), actor, { q, status, ...pageWindow(req) });
  return (
    <AdminShell userId={userId} current="/admin/queues">
      <Link href="/admin/queues/rfqs" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Queues
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">All RFQs</h1>
          <p className="type-body text-secondary">
            Every request for quotes. RFQs to two or more suppliers are checked in Queues · RFQs first.
          </p>
        </div>
        <Link href="/admin/queues/rfqs/unanswered" className="type-label text-link underline">
          RFQs waiting for quotes
        </Link>
      </div>
      <ListFilters
        placeholder="Search reference, title or buyer"
        q={sp.q}
        selects={[
          {
            name: "status",
            label: "Status",
            value: status ?? "",
            options: [{ value: "", label: "Any status" }, ...RFQ_LIST_STATUSES.map((s) => ({ value: s, label: s }))],
          },
        ]}
      />
      <ListTable
        label="All RFQs"
        headings={["RFQ", "Buyer", "Suppliers", "Answered", "Status", "Created"]}
        paged={{ page: req.page, perPage: req.perPage, total }}
        query={pagingQuery(sp)}
        clearHref="/admin/rfqs"
        filtered={Boolean(q ?? status)}
        emptyTitle="No RFQs yet"
        emptyText="RFQs appear here as buyers write them."
      >
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-default align-top">
            <td className="px-4 py-3">
              <Link href={`/admin/queues/rfqs/${r.id}`} className="block type-label text-link underline">
                {r.reference}
              </Link>
              {r.title ? <span className="block type-caption text-secondary">{r.title}</span> : null}
            </td>
            <td className="px-2 py-3 type-body-sm">{r.buyer}</td>
            <td className="px-2 py-3 type-body-sm">{r.suppliers}</td>
            <td className="px-2 py-3 type-body-sm">
              {r.suppliers ? `${String(r.quoted)} of ${String(r.suppliers)}` : "—"}
            </td>
            <td className="px-2 py-3">
              <StatusBadge status={r.status} tone={TONE[r.status] ?? "neutral"} />
            </td>
            <td className="px-2 py-3 type-body-sm">{formatIstDate(r.createdAt)}</td>
          </tr>
        ))}
      </ListTable>
    </AdminShell>
  );
}
