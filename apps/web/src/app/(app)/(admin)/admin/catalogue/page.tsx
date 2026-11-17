import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import {
  catalogueApplications,
  catalogueTree,
  categoryDetail,
  categoryHistory,
  type TreeClass,
} from "@h2india/core/catalogue/taxonomy";
import type { Metadata } from "next";
import { AdminShell, requireOperator } from "@/admin/shell";
import { CatalogueView, type CatalogueData, type CatalogueTab } from "./CatalogueView";
import { categoryMeta, historyLine } from "./format";

// Admin Catalogue · Taxonomy (636:596) with Add attribute (637:417), step 6.1. Operators with catalogue.view see it;
// catalogue.edit can change it. Others get a plain 404, so the screen's existence isn't revealed.
export const metadata: Metadata = { title: "Catalogue · H2 Economy admin", robots: { index: false } };

/** The category opened first: the one in the address, else the first with attributes (Diaphragm at launch). */
function pick(tree: TreeClass[], wanted: string | undefined): string | null {
  const all = tree.flatMap((c) => c.categories.flatMap((cat) => [cat, ...cat.children]));
  if (wanted && all.some((c) => c.id === wanted)) return wanted;
  const diaphragm = tree
    .find((c) => c.id === "systems")
    ?.categories.find((c) => c.slug === "compression-systems")
    ?.children.find((c) => c.slug === "diaphragm");
  return diaphragm?.id ?? all[0]?.id ?? null;
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; state?: string; tab?: string }>;
}) {
  // The standard back-office gate and frame (founder QC, 17 Nov 2026): the operator's own session (never a viewed
  // person), the staff password sign-in, and the larger-screen cover.
  const { userId, actor } = await requireOperator("catalogue.view", "/admin/catalogue");
  const db = getDb();
  const { category, state, tab: askedTab } = await searchParams;
  const tab: CatalogueTab =
    askedTab === "details" || askedTab === "applications" || askedTab === "history" ? askedTab : "attributes";

  const [tree, applications] = await Promise.all([
    catalogueTree(db, actor),
    catalogueApplications(db, { includeHidden: true }),
  ]);
  const selectedId = pick(tree, category);
  const [detail, history] = selectedId
    ? await Promise.all([
        categoryDetail(db, actor, selectedId),
        categoryHistory(db, actor, selectedId, tab === "history" ? 500 : 1),
      ])
    : [null, []];

  // ?state= shows the designed loading, empty and error states in development (playbook step 2.5).
  const demo = process.env.NODE_ENV !== "production" || process.env.FLAG_DEV_PAGES === "true" ? state : undefined;
  const data: CatalogueData = {
    tree,
    canEdit: can(actor, "catalogue.edit"),
    tab,
    applications: applications.map((a) => ({ id: a.id, label: a.shortLabel, hidden: a.hidden })),
    category: detail
      ? {
          ...detail,
          meta: categoryMeta({
            liveProducts: detail.liveProducts,
            attributes: detail.attributes.length,
            lastChange: detail.lastChange,
          }),
          history: history.map(historyLine),
        }
      : null,
  };

  return (
    <AdminShell userId={userId} current="/admin/catalogue">
      <CatalogueView
        data={data}
        demoState={demo === "loading" || demo === "empty" || demo === "error" ? demo : undefined}
      />
    </AdminShell>
  );
}
