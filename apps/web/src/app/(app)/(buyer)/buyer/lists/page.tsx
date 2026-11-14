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

// Saved lists (78:2628), step 9.1. ?list= picks the list; ?state=loading|error|empty forces the designed states.
export const metadata: Metadata = { title: "Saved lists · H2 India", robots: { index: false } };
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
      <h1 className="type-h2">Saved lists</h1>
      <LiveSection
        label="Saved lists"
        state={forced ?? (lists.length ? "ready" : "empty")}
        skeleton={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <div className="flex flex-col gap-4">
            <nav aria-label="Lists" className="flex flex-wrap items-center gap-2">
              {lists.map((l) => (
                <Link
                  key={l.id}
                  href={`/buyer/lists?list=${l.id}`}
                  aria-current={l.id === current.id ? "page" : undefined}
                  className={cx(
                    "rounded-pill border px-3 py-1.5 type-label-sm",
                    l.id === current.id
                      ? "border-transparent bg-inverse text-inverse"
                      : "border-control hover:bg-subtle",
                  )}
                >
                  {l.name} · {l.count}
                </Link>
              ))}
              {canEdit ? <NewList /> : null}
            </nav>
            <ListBoard key={current.id} listId={current.id} name={current.name} cards={cards} canEdit={canEdit} />
          </div>
        ) : null}
      </LiveSection>
    </BuyerWorkspace>
  );
}
