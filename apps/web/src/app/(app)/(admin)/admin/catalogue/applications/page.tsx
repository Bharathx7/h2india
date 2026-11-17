import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { applicationUsage, catalogueApplications } from "@h2india/core/catalogue/taxonomy";
import { Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { ApplicationsManager } from "./ApplicationsManager";

// Catalogue · Applications (founder QC, 17 Nov 2026): the browse-by-application list (home tiles, the Marketplace menu
// and landing). Before this, categories could only tick the applications the launch migration made.
export const metadata: Metadata = { title: "Applications · Catalogue · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const { userId, actor } = await requireOperator("catalogue.view", "/admin/catalogue/applications");
  const db = getDb();
  const [rows, usage] = await Promise.all([
    catalogueApplications(db, { includeHidden: true }),
    applicationUsage(db, actor),
  ]);
  return (
    <AdminShell userId={userId} current="/admin/catalogue">
      <Link href="/admin/catalogue" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Catalogue
      </Link>
      <ApplicationsManager
        canEdit={can(actor, "catalogue.edit")}
        rows={rows.map((r) => ({ ...r, categories: usage.get(r.id) ?? 0 }))}
      />
    </AdminShell>
  );
}
