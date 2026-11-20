import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { applicationUsage, catalogueApplications } from "@h2india/core/catalogue/taxonomy";
import type { Metadata } from "next";
import { AdminShell, requireOperator } from "@/admin/shell";
import { CatalogueTabs } from "../CatalogueTabs";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";
import { ApplicationsManager } from "./ApplicationsManager";

// Catalogue · Applications (founder QC, 17 Nov 2026): the browse-by-application list (home tiles, the Marketplace menu
// and landing). Before this, categories could only tick the applications the launch migration made.
export const metadata: Metadata = { title: "Applications · Catalogue · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("catalogue.view", "/admin/catalogue/applications");
  const db = getDb();
  const [rows, usage] = await Promise.all([
    catalogueApplications(db, { includeHidden: true }),
    applicationUsage(db, actor),
  ]);
  const paged = pageOf(rows, pageRequest(sp));
  return (
    <AdminShell userId={userId} current="/admin/catalogue">
      <CatalogueTabs current="applications" />
      <ApplicationsManager
        canEdit={can(actor, "catalogue.edit")}
        rows={paged.rows.map((r) => ({ ...r, categories: usage.get(r.id) ?? 0 }))}
      />
      <ListPager paged={paged} query={pagingQuery(sp)} />
    </AdminShell>
  );
}
