import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import {
  catalogueApplications,
  catalogueTree,
  categoryDetail,
  categoryHistory,
  categoryRequestQueue,
} from "@h2india/core/catalogue/taxonomy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell, requireOperator } from "@/admin/shell";
import { CatalogueTabs } from "../../CatalogueTabs";
import { CatalogueView, type CatalogueData, type CatalogueTab } from "../../CatalogueView";
import { categoryMeta, historyLine } from "../../format";

// One category (founder, 20 Nov 2026; was the right side of Catalogue, 636:596): its product fields, sub-categories,
// details, applications and history, with the same dialogs and rules as before (step 6.1, A107).
export const metadata: Metadata = { title: "Category · Catalogue · H2 Economy admin", robots: { index: false } };

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ state?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { state, tab: askedTab } = await searchParams;
  const { userId, actor } = await requireOperator("catalogue.view", `/admin/catalogue/categories/${id}`);
  const db = getDb();
  const tab: CatalogueTab =
    askedTab === "details" || askedTab === "applications" || askedTab === "history" ? askedTab : "attributes";
  const [tree, applications, requests] = await Promise.all([
    catalogueTree(db, actor),
    catalogueApplications(db, { includeHidden: true }),
    can(actor, "queues.view") ? categoryRequestQueue(db, actor) : Promise.resolve([]),
  ]);
  const known = tree.some((c) => c.categories.some((n) => n.id === id || n.children.some((ch) => ch.id === id)));
  if (!known) notFound();
  const [detail, history] = await Promise.all([
    categoryDetail(db, actor, id),
    categoryHistory(db, actor, id, tab === "history" ? 500 : 1),
  ]);
  if (!detail) notFound();
  // ?state= shows the designed loading, empty and error states in development (playbook step 2.5).
  const demo = process.env.NODE_ENV !== "production" || process.env.FLAG_DEV_PAGES === "true" ? state : undefined;
  const data: CatalogueData = {
    tree,
    canEdit: can(actor, "catalogue.edit"),
    tab,
    applications: applications.map((a) => ({ id: a.id, label: a.shortLabel, hidden: a.hidden })),
    category: {
      ...detail,
      meta: categoryMeta({
        liveProducts: detail.liveProducts,
        attributes: detail.attributes.length,
        lastChange: detail.lastChange,
      }),
      history: history.map(historyLine),
    },
  };
  return (
    <AdminShell userId={userId} current="/admin/catalogue">
      <CatalogueTabs current="categories" requests={requests.length} />
      <CatalogueView
        data={data}
        demoState={demo === "loading" || demo === "empty" || demo === "error" ? demo : undefined}
      />
    </AdminShell>
  );
}
