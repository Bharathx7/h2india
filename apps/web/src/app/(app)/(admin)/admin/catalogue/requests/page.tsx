import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { categoryRequestQueue } from "@h2india/core/catalogue/taxonomy";
import { formatIstDate } from "@h2india/core/time";
import { buttonClasses, EmptyState } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";
import { CatalogueTabs } from "../CatalogueTabs";

// Catalogue · Requests (founder, 20 Nov 2026): categories suppliers asked for, oldest first. Each opens its decision
// page in Queues, where an operator with catalogue.edit approves (adding the category) or rejects with a reason.
export const metadata: Metadata = { title: "Requests · Catalogue · H2 Economy admin", robots: { index: false } };

export default async function CategoryRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("catalogue.view", "/admin/catalogue/requests");
  const db = getDb();
  const seesQueue = can(actor, "queues.view");
  const rows = seesQueue ? await categoryRequestQueue(db, actor) : [];
  const paged = pageOf(rows, pageRequest(sp));
  return (
    <AdminShell userId={userId} current="/admin/catalogue">
      <CatalogueTabs current="requests" requests={rows.length} />
      {!seesQueue ? (
        <p className="type-body-sm text-secondary">Your role can't see the request queue.</p>
      ) : paged.rows.length ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Category requests"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Category asked for
                </th>
                <th scope="col" className="px-2 py-3">
                  Company
                </th>
                <th scope="col" className="px-2 py-3">
                  Asked by
                </th>
                <th scope="col" className="px-2 py-3">
                  Asked on
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Decide</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((r) => (
                <tr key={r.id} className="border-t border-default">
                  <th scope="row" className="px-4 py-3 text-left type-label">
                    {r.label}
                  </th>
                  <td className="px-2 py-3 type-body-sm">{r.company}</td>
                  <td className="px-2 py-3 type-body-sm">{r.requester ?? "—"}</td>
                  <td className="px-2 py-3 type-body-sm">{formatIstDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/queues/categories/${r.id}`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      Review<span className="sr-only"> {r.label}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="No requests waiting">
            When a supplier asks for a category that isn't there, it shows here.
          </EmptyState>
        </div>
      )}
      <ListPager paged={paged} query={pagingQuery(sp)} />
    </AdminShell>
  );
}
