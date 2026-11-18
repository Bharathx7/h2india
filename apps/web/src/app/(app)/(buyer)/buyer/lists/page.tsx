import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { listCards, projectLists } from "@h2india/core/buyer";
import { cx, EmptyState, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ListBoard, NewList } from "@/buyer/ListBoard";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";

// Project lists (78:2628), step 9.1; "Project lists" everywhere since founder QC (17 Nov 2026), as in the sidebar. ?list= picks the list; ?state=loading|error|empty forces the designed states.
export const metadata: Metadata = { title: "Project lists · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string; state?: string }>;
}) {
  const sp = await searchParams;
  const page = await requireBuyer("/buyer/lists");
  const b = page.buyer;
  const db = getDb();
  const scope = scopeFor(page.actor);
  const lists = await projectLists(db, scope, b.organisationId);
  const current = lists.find((l) => l.id === sp.list) ?? lists[0];
  const cards = current ? await listCards(db, scope, b.organisationId, current.id) : [];
  const canEdit = b.seat.permissions.has("rfq.create") || b.seat.permissions.has("company.manage");
  const forced = forcedState(sp.state);
  return (
    <BuyerWorkspace page={page} current="/buyer/lists">
      <div>
        <h1 className="type-h2">Project lists</h1>
        <p className="type-body-sm text-secondary">
          Shortlists of products your company shares. Add products from any product page, then compare them or request
          quotes together.
        </p>
      </div>
      <LiveSection
        label="Project lists"
        state={forced ?? (lists.length ? "ready" : "empty")}
        skeleton={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton kind="card" />
            <Skeleton kind="card" />
            <Skeleton kind="card" />
          </div>
        }
        empty={
          <div className="flex flex-col items-start gap-3">
            <EmptyState kind="first-use" icon="folder" title="No lists yet">
              Group products for a project, share them with your team and request quotes for them together.
            </EmptyState>
            {canEdit ? <NewList label="New list" /> : null}
          </div>
        }
      >
        {current ? (
          // Founder QC (17 Nov 2026): the lists on the left, the chosen list on the right.
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <nav aria-label="Lists" className="flex flex-col gap-1 rounded-card border border-default bg-page p-2">
              <p className="px-3 pt-2 pb-1 type-label-sm text-secondary">
                {lists.length} {lists.length === 1 ? "list" : "lists"}
              </p>
              {lists.map((l) => (
                <Link
                  key={l.id}
                  href={`/buyer/lists?list=${l.id}`}
                  aria-current={l.id === current.id ? "page" : undefined}
                  className={cx(
                    "flex items-center justify-between gap-2 rounded-control px-3 py-2.5",
                    l.id === current.id ? "bg-mint type-label text-primary" : "type-body-sm text-body hover:bg-subtle",
                  )}
                >
                  <span className="min-w-0 truncate">{l.name}</span>
                  <span className="shrink-0 type-caption text-secondary tabular-nums">{l.count}</span>
                </Link>
              ))}
              {canEdit ? (
                <div className="border-t border-default px-1 pt-2">
                  <NewList label="New list" />
                </div>
              ) : null}
            </nav>
            <div className="min-w-0 rounded-card border border-default bg-page p-5">
              <ListBoard key={current.id} listId={current.id} name={current.name} cards={cards} canEdit={canEdit} />
            </div>
          </div>
        ) : null}
      </LiveSection>
    </BuyerWorkspace>
  );
}
