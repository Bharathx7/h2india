import { countSupportRequests, supportRequests } from "@h2india/core/recovery";
import { formatIstDateTime } from "@h2india/core/time";
import { cx, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { UsersHeader, UserTabs } from "@/admin/users/Tabs";
import { ListPager } from "@/components/ListPager";
import { pageRequest, pageWindow, pagingQuery } from "@/lib/paging";

// Support requests (founder QC, 17 Nov 2026): people who lost their email and sent their work ID, and recovery
// requests whose company has no admin to approve them. Before this they reached H2 Economy only as an email to
// support. Each opens its review page (/account/recovery/<id>), where support checks the ID and answers or closes it.
export const metadata: Metadata = { title: "Support requests · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = {
  support: "Lost email · work ID",
  email: "Lost email",
  mobile: "Changed mobile",
  passkey: "Lost passkey",
};

export default async function SupportRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users/support");
  const done = sp.view === "done";
  // Paged in the database (founder, 19 Nov 2026): before, only the first 1,000 open or 500 answered could be reached.
  const req = pageRequest(sp);
  const [rows, total, openCount] = await Promise.all([
    supportRequests(actor, done, pageWindow(req)),
    countSupportRequests(actor, done),
    countSupportRequests(actor, false),
  ]);
  const paged = { ...req, rows, total };
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <UsersHeader />
      <UserTabs current="support" counts={{ support: openCount }} />
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "open", label: "Waiting for support" },
          { key: "done", label: "Answered" },
        ].map((v) => {
          const here = (v.key === "done") === done;
          return (
            <Link
              key={v.key}
              href={v.key === "done" ? "/admin/users/support?view=done" : "/admin/users/support"}
              aria-current={here ? "page" : undefined}
              className={cx(
                "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
                here ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
              )}
            >
              {v.label}
            </Link>
          );
        })}
      </div>
      {rows.length ? (
        <>
          <div
            className="relative overflow-x-auto rounded-card border border-default"
            tabIndex={0}
            role="region"
            aria-label="Support requests"
          >
            <table className="w-full min-w-200 text-left">
              <thead className="bg-subtle type-label-sm">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Person
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Request
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Sent
                  </th>
                  <th scope="col" className="px-2 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((r) => (
                  <tr key={r.id} className="border-t border-default align-top">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <span className="block type-label">{r.name || r.email}</span>
                      <span className="block type-caption text-secondary">
                        {[r.company, r.email].filter(Boolean).join(" · ")}
                      </span>
                    </th>
                    <td className="px-2 py-3 type-body-sm">
                      {KIND[r.kind] ?? r.kind}
                      {r.reference ? <span className="block type-caption text-secondary">{r.reference}</span> : null}
                    </td>
                    <td className="px-2 py-3 type-body-sm">{formatIstDateTime(r.createdAt)}</td>
                    <td className="px-2 py-3">
                      <StatusBadge status={r.status} tone={done ? "neutral" : "warning"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/account/recovery/${r.id}`} className="type-label text-link underline">
                        {done ? "View" : "Review"}
                        <span className="sr-only"> request from {r.name || r.email}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPager paged={paged} query={pagingQuery(sp)} />
        </>
      ) : (
        <EmptyState title={done ? "Nothing answered yet" : "No support requests waiting"}>
          {done
            ? "Requests support has closed or answered show here."
            : "People who lost their email, or whose company has no admin to approve a change, show here."}
        </EmptyState>
      )}
    </AdminShell>
  );
}
