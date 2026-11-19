import { getDb } from "@h2india/core";
import { countAppeals, listAppeals } from "@h2india/core/admin/appeals";
import { formatIstDate, formatIstDateTime } from "@h2india/core/time";
import { EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import { AdminShell, requireOperator } from "@/admin/shell";
import { AppealDecision } from "@/admin/users/AppealDecision";
import { UsersHeader, UserTabs } from "@/admin/users/Tabs";
import { ListPager } from "@/components/ListPager";
import { pageRequest, pageWindow, pagingQuery } from "@/lib/paging";

// Appeals against company suspensions (G10): read with users.view, decided with users.edit. Built without a frame
// (A178).
export const metadata: Metadata = { title: "Appeals · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AppealsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users/appeals");
  // Paged in the database (founder, 19 Nov 2026): before, only the newest 200 could be reached.
  const req = pageRequest(sp);
  const db = getDb();
  const [rows, total, open] = await Promise.all([
    listAppeals(db, actor, pageWindow(req)),
    countAppeals(db, actor),
    countAppeals(db, actor, { open: true }),
  ]);
  // Paged (founder QC, 17 Nov 2026); the tab's count stays the open appeals.
  const paged = { ...req, rows, total };
  const canEdit = actor.operator.has("users.edit");
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <UsersHeader />
      <UserTabs current="appeals" counts={{ appeals: open }} />
      {rows.length ? (
        <ul className="flex flex-col gap-3">
          {paged.rows.map(({ appeal, company, suspendReason, suspendedAt, sender }) => (
            <li
              key={appeal.id}
              className="grid grid-cols-1 gap-4 rounded-card border border-default bg-page p-5 lg:grid-cols-[minmax(0,1fr)_320px]"
            >
              <div className="flex flex-col gap-2">
                <p className="flex flex-wrap items-center gap-2 type-label">
                  {company}
                  <StatusBadge
                    status={appeal.status}
                    tone={appeal.status === "Open" ? "warning" : appeal.status === "Lifted" ? "success" : "neutral"}
                  />
                </p>
                <p className="type-caption text-secondary">
                  {suspendedAt ? `Suspended ${formatIstDate(suspendedAt)}: ${suspendReason ?? ""} · ` : ""}appeal from{" "}
                  {sender}, {formatIstDateTime(appeal.createdAt)}
                </p>
                <p className="type-body-sm text-body">{appeal.reason}</p>
                {appeal.note ? <p className="type-body-sm text-secondary">Decision: {appeal.note}</p> : null}
              </div>
              {appeal.status === "Open" && canEdit ? <AppealDecision id={appeal.id} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {rows.length ? (
        <ListPager paged={paged} query={pagingQuery(sp)} />
      ) : (
        <EmptyState title="No appeals">Appeals from suspended companies appear here.</EmptyState>
      )}
    </AdminShell>
  );
}
